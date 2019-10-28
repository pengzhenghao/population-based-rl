google.charts.load('current', {'packages': ['corechart', 'controls']});
google.charts.setOnLoadCallback(drawChart);

var data_table;
var linechart_data_table;
var current_tune_flag = true;
var current_color_flag = true;
var current_tensity = 0;
var prefix = "";
var rawData = $.parseJSON($.ajax({
    url: file_path,
    dataType: "json",
    async: false
}).responseText);

// var chart;

function createCustomHTMLContent(videoPath) {
    return "" +
        // '<a href="' + hyperLink + '">' +
        '<video width="80" height="80" autoplay loop muted>' +
        '<source src="' + videoPath +
        '" type="video/mp4" /></video>'
    // '</a>' +
}

function changeText(elementId, text, innerhtml = false) {
    var element = document.getElementById(elementId);
    if (innerhtml) {
        element.innerHTML = text;
    } else {
        element.innerText = text;
    }
}

function get_fig_title(method) {
    return method + " representation, " +
        (current_tune_flag ? "fine-tuned" : "no fine-tuned") +
        (typeof (current_tensity) === "string" ? ", all noise tensity displayed" : ", noise tensity " +
            current_tensity.toString())
}


function drawChart() {
    ////////// Step 1: Initialize The figure //////////
    const figure_info = rawData['figure_info'];
    const tensity_multiplier = figure_info['tensity_multiplier'];

    var dashboard, slider, filter, chart, linechart_dashboard,
        linechart_filter, linechart_chart;

    var cluster_column_indices, linechart_cluster_column_indices;

    function build_dashboard() {
        chart = new google.visualization.ChartWrapper(
            {
                "chartType": "ScatterChart",
                "containerId": "chart_div",
                "options": {
                    "tooltip": {"isHtml": true, "trigger": "selection"},
                    // "title": figure_info['title'],
                    "hAxis": {
                        "title": figure_info['xlabel'],
                        "minValue": figure_info['xlim'] ? figure_info['xlim'][0] : null,
                        "maxValue": figure_info['xlim'] ? figure_info['xlim'][1] : null
                    },
                    "vAxis": {
                        "title": figure_info['ylabel'],
                        "minValue": figure_info['ylim'] ? figure_info['ylim'][0] : null,
                        "maxValue": figure_info['ylim'] ? figure_info['ylim'][1] : null
                    },
                    "legend": "none",
                    "aggregationTarget": "none",
                    "selectionMode": "multiple",
                    "theme": "maximized",
                    "fontSize": 12
                },
                "view": {'columns': cluster_column_indices} // show all points regard of std.
            });

        filter = new google.visualization.ControlWrapper({
            'controlType': 'CategoryFilter',
            'containerId': 'control_div',
            'options': {
                'filterColumnLabel': "method",
                // 'filterColumnIndex': 4,
                'ui': {
                    // 'label': 'Choose one of the Representation Methods: ',
                    'allowNone': false,
                    "allowMultiple": false,
                    "allowTyping": false,
                    // "labelStacking": 'vertical',
                    // 'cssClass': 'step1'
                }
            },
            'state': {'selectedValues': [rawData['figure_info']['methods'][0]]}
        });
        dashboard = new google.visualization.Dashboard(
            document.getElementById('dashboard_div'));
        dashboard.bind(filter, chart);
        dashboard.draw(data_table);
    }

    function build_line_chartdashboard(linechart_series_options) {
        linechart_chart = new google.visualization.ChartWrapper(
            {
                "chartType": "LineChart",
                "containerId": "linechart_div",
                "options": {
                    "interpolateNulls": true,
                    'legend': {
                        "position": "bottom",
                        "textStyle": {"fontSize": 11}
                    },
                    "series": linechart_series_options,
                    "vAxes": {
                        0: {
                            "title": "Episode Reward",
                            "gridlines": {"color": 'none'}
                        },
                        1: {
                            "title": "Episode Length",
                            "gridlines": {"color": 'none'},
                            "textPosition": 'in'
                        },
                        2: {
                            "title": "Normalized Distance"
                        },
                    },
                    "tooltip": {"trigger": "selection"},
                    // "title": figure_info['title'],
                    "hAxis": {
                        // "gridlines": {"color": 'none'},
                        "title": figure_info['xlabel'],
                        // "minValue": figure_info['xlim'] ? figure_info['xlim'][0] : null,
                        // "maxValue": figure_info['xlim'] ? figure_info['xlim'][1] : null
                    },
                    "vAxis": {
                        // "gridlines": {"color": 'none'},
                        // "title": figure_info['ylabel'],
                        // "minValue": figure_info['ylim'] ? figure_info['ylim'][0] : null,
                        // "maxValue": figure_info['ylim'] ? figure_info['ylim'][1] : null
                    },
                    // "legend": "none",
                    // "aggregationTarget": "none",
                    // "selectionMode": "multiple",
                    // "theme": "maximized",
                    // "fontSize": 12
                },
                "view": {'columns': linechart_cluster_column_indices} // show all points regard of std.
            });

        linechart_filter = new google.visualization.ControlWrapper({
            'controlType': 'CategoryFilter',
            'containerId': 'linechart_control_div',
            'options': {
                'filterColumnLabel': "label",
                'ui': {
                    'label': 'Distance Measurements',
                    'allowNone': true,
                    "allowMultiple": true,
                    "allowTyping": false,
                    "labelStacking": 'vertical',
                }
            },
            'state': {
                'selectedValues': linechart_data_table.getDistinctValues(
                    linechart_data_table.getColumnIndex("label"))
            }
        });

        var linechart_data_view = new google.visualization.DataView(linechart_data_table);

        linechart_dashboard = new google.visualization.Dashboard(
            document.getElementById('linechart_dashboard_div'));
        linechart_dashboard.bind(linechart_filter, linechart_chart);
        linechart_dashboard.draw(linechart_data_view);
    }

    function get_exact_std(slider_value) {
        return figure_info['tensities'][slider_value]
    }

// Create the slider for std changing
    function build_slider() {
        slider = document.getElementById("tensitySlider");
        slider.value = figure_info['tensities'][0];
        slider.min = 0;
        slider.max = figure_info['num_tensities'] - 1;
        slider.oninput = function () {
            current_tensity = get_exact_std(this.value);
            flush();
        };
        var dis_str = get_exact_std(figure_info['tensities'][0]).toString();
        for (var t = 1; t < figure_info['tensities'].length; t++) {
            dis_str = dis_str + ", " + get_exact_std(t).toString();
        }
        current_tensity = "All of: \n" + dis_str;
        changeText("title_of_table", rawData['web_info']['title']);
        changeText("introduction", rawData['web_info']['introduction'], true);
        changeText("tensity", current_tensity);

        document.getElementById('disable_color_button').innerHTML =
            "Click to disable clustering";
        changeText("finetune", "Fine-tuned");
        changeText("update_date", rawData['web_info']['update_date']);
    }

    function parse_data_table(old_data_table) {
        var i;
        var cluster_indices_map = {};

        var cluster_indices = old_data_table.getDistinctValues(
            old_data_table.getColumnIndex("cluster"));

        cluster_column_indices = [0];

        var new_data_table = new google.visualization.DataTable();
        var tooltips_col_indices = [];

        new_data_table.addColumn('number', 'x', 'x');
        for (i = 0; i < cluster_indices.length; i++) {
            var name = "cluster" + cluster_indices[i].toString();
            new_data_table.addColumn('number', name, name);
            new_data_table.addColumn(
                {
                    'type': 'string',
                    'role': 'tooltip',
                    'p': {'html': true}
                }
            );
            cluster_indices_map[cluster_indices[i]] = 2 * i + 1;
            cluster_column_indices.push(i * 2 + 1);
            cluster_column_indices.push(i * 2 + 2);
            tooltips_col_indices.push(i * 2 + 2);
        }
        new_data_table.addColumn('number', 'tensity', 'tensity');
        new_data_table.addColumn('string', 'method', 'method');

        new_data_table.addRows(old_data_table.getNumberOfRows());

        var tensity_col_id = new_data_table.getColumnIndex("tensity");
        var method_col_id = new_data_table.getColumnIndex("method");

        for (i = 0; i < old_data_table.getNumberOfRows(); i++) {
            new_data_table.setCell(i, 0, old_data_table.getValue(i, 0));

            new_data_table.setCell(i,
                cluster_indices_map[old_data_table.getValue(i, 2)],
                old_data_table.getValue(i, 1)
            );
            for (var y = 0; y < tooltips_col_indices.length; y++) {
                new_data_table.setCell(i,
                    tooltips_col_indices[y],
                    old_data_table.getValue(i, 5)
                );
            }
            new_data_table.setCell(i, tensity_col_id,
                old_data_table.getValue(i, 3));
            new_data_table.setCell(i, method_col_id,
                old_data_table.getValue(i, 4));
            new_data_table.setRowProperties(i, old_data_table.getRowProperties(i));
        }
        return new_data_table;
    }

    function setup_data_table() {
        var newData;
        if (current_tune_flag) {
            newData = rawData['data']['fine_tuned']
        } else {
            newData = rawData['data']['no_fine_tuned']
        }
        data_table = new google.visualization.DataTable(newData);

        // Fill the tooltip
        data_table.addColumn(
            {
                'type': 'string',
                'role': 'tooltip',
                'p': {'html': true}
            }
        );
        var url, cell_html, row, extra;
        for (row = 0; row < data_table.getNumberOfRows(); row++) {

            if (data_table.getRowProperty(row, "path")) {
                url = prefix + data_table.getRowProperty(row, "path").replace("./", "");
                cell_html = createCustomHTMLContent(url)
            } else {
                cell_html = '<p>No Video Provided</p>';
            }
            if (data_table.getRowProperty(row, "reward")) {
                extra = "Reward: " + data_table.getRowProperty(row, "reward").toFixed(1);
            }
            if (extra !== null) {
                cell_html = cell_html +
                    '<br><p style="max-width: 80px;' +
                    'word-wrap: break-word">' + extra + '</p>';
            }
            cell_html = '<dev style="padding:0 0 0 0">' + cell_html
                + '</dev>';
            data_table.setCell(row, data_table.getNumberOfColumns() - 1, cell_html);
        }

        if (current_color_flag) {
            data_table = parse_data_table(data_table);
        } else {
            cluster_column_indices = [0, 1, 5];
        }
    }


    function setup_linechart_data_table() {
        var newData;
        if (current_tune_flag) {
            newData = rawData['linechart_data']['fine_tuned']
        } else {
            newData = rawData['linechart_data']['no_fine_tuned']
        }
        var tmp_datatable = new google.visualization.DataTable(newData);
        linechart_data_table = new google.visualization.DataTable();
        linechart_data_table.addColumn("number", "intensity", "intensity");

        var unique_labels = tmp_datatable.getDistinctValues(
            tmp_datatable.getColumnIndex("label"));

        linechart_cluster_column_indices = [0];

        var linechart_series_options = {};

        var label_column_index_map = {};
        for (var i = 0; i < unique_labels.length; i++) {
            if (unique_labels[i].startsWith("episode")) {
                linechart_series_options[i] = {
                    "targetAxisIndex": (unique_labels[i] === "episode_reward_mean") ? 0 : 1
                }
            } else {
                linechart_series_options[i] = {"targetAxisIndex": 2}
            }
            linechart_data_table.addColumn("number", unique_labels[i], unique_labels[i]);
            label_column_index_map[unique_labels[i]] = i + 1;
            linechart_cluster_column_indices.push(i + 1);
        }
        linechart_data_table.addColumn("string", "label", "label");

        linechart_data_table.addRows(tmp_datatable.getNumberOfRows());
        for (var row = 0; row < tmp_datatable.getNumberOfRows(); row++) {
            linechart_data_table.setCell(row, 0, tmp_datatable.getValue(
                row, 0
            ));
            var observe_column;
            if (tmp_datatable.getValue(row, 2).startsWith("episode")) {
                observe_column = 1
            } else {
                observe_column = 3
            }
            linechart_data_table.setCell(
                row,
                label_column_index_map[tmp_datatable.getValue(row, 2)],
                tmp_datatable.getValue(row, observe_column));

            linechart_data_table.setCell(
                row,
                linechart_data_table.getColumnIndex("label"),
                tmp_datatable.getValue(
                    row, 2
                ));
        }
        return linechart_series_options
    }

    function flush() {
        update_data_view();
        changeText("tensity", current_tensity);
        // changeText("tensity2", current_tensity);
        // changeText("finetuned", current_tune_flag ? "fine-tuned" : "not fine-tuned");
        dashboard.draw(data_table);
        chart.setOption("title", get_fig_title(filter.getState()['selectedValues'][0]))
    }

    function update_data_view() {
        var tmp_dt = chart.getDataTable();
        if (tmp_dt !== null) {
            chart.setView({
                "columns": cluster_column_indices,
                "rows": tmp_dt.getFilteredRows(
                    [{
                        column: tmp_dt.getColumnIndex("tensity"),
                        value: parseInt(current_tensity * tensity_multiplier)
                    }]
                )
            });
        }
    }

    function init() {
        build_slider();
        setup_data_table();
        var linechart_series_options = setup_linechart_data_table();
        build_dashboard();
        build_line_chartdashboard(linechart_series_options);
        set_lim();
        flush();
    }

    init();

////////// Event Handler //////////
    function set_lim() {
        var method = filter.getState()['selectedValues'][0];
        var tuned_str = current_tune_flag ? "fine_tuned" : "no_fine_tuned"
        var xlim = figure_info['xlim'][tuned_str][method];
        var ylim = figure_info['ylim'][tuned_str][method];
        var dx = 0.1 * (xlim[1] - xlim[0]);
        var dy = 0.1 * (ylim[1] - ylim[0]);
        chart.setOption("hAxis.viewWindow.min", xlim[0] - dx);
        chart.setOption("hAxis.viewWindow.max", xlim[1] + dx);
        chart.setOption("vAxis.viewWindow.min", ylim[0] - dy);
        chart.setOption("vAxis.viewWindow.max", ylim[1] + dy);
    }

    google.visualization.events.addListener(filter, 'statechange', set_lim);

    change2FineTuned = function () {
        current_tune_flag = true;
        init();
        changeText("finetune", "Fine-tuned");
    };

    change2NotFineTuned = function () {
        current_tune_flag = false;
        init();
        changeText("finetune", "Not Fine-tuned");
    };

    reset_slider = function () {
        build_slider();
        flush();
    };

    clear_selection = function () {
        chart.getChart().setSelection();
    };

    change_color = function () {
        current_color_flag = !current_color_flag;
        setup_data_table();
        flush();
        var button = document.getElementById('disable_color_button');
        if (current_color_flag) {
            button.innerHTML = "Click to disable clustering";
        } else {
            button.innerHTML = "Click to enable clustering";
        }
    };

    remove_selection = function () {
        linechart_filter.setState({"selectedValues": ["cka_mean"]});
        linechart_dashboard.draw(linechart_data_table);
    };

}