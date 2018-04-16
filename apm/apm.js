$(document).ready(function () {
    var graphJson = null;

    // make element
    function me(g, id, text, x, y, s) {
        var padding = 100;
        var e = new joint.shapes.basic.Circle({
            id: id,
            position: { x: padding + (x - 1), y: padding + (y - 1) },
            size: { width: s || 150, height: s || 150 },
            attrs: {
                text: { text: text },
                circle: {
                    stroke: '#9586fd',
                    'stroke-width': 3
                },

            }
        });
        return e;
    }

    // make link
    function ml(g, id, text, a, b, v) {
        var source = a.x ? a : { id: a.id };
        var target = b.x ? b : { id: b.id };
        var l = new joint.dia.Link({
            id: id,
            source: source,
            target: target,
            // router: { name: 'manhattan' },
            connector: { name: 'smooth' },
            labels: [{ position: .5, attrs: { text: { text: text } } }],
            attrs: {
                '.connection': {
                    stroke: '#F7B93E',
                    'stroke-width': 6
                },
                '.marker-target': { fill: '#F7B93E', stroke: '#F7B93E', d: 'M 10 0 L 0 5 L 10 10 z' }
            },
            vertices: v
        });
        return l;
    }

    var calcSize = function (points) {
        var maxX = 0;
        var maxY = 0;
        for (var i = 0; i < points.length; i++) {
            if (maxX < points[i]['x']) {
                maxX = points[i]['x'];
            }
            if (maxY < points[i]['y']) {
                maxY = points[i]['y'];
            }
        }
        return [maxX, maxY];
    }

    var regexName = function (name) {
        var regex1 = /:(.*)\(\[.*\]\)$/;
        var regex2 = /[^\/]+/g;

        var result1 = name.match(regex1);
        if (result1 != null) {
            return result1[result1.length - 1];
        }

        var result2 = name.match(regex2);
        if (result2 != null) {
            return result2[result2.length - 1];
        }
        return name;
    }

    function adjustVertices(graph, cell) {

        // If the cell is a view, find its model.
        cell = cell.model || cell;

        if (cell instanceof joint.dia.Element) {

            _.chain(graph.getConnectedLinks(cell)).groupBy(function (link) {
                // the key of the group is the model id of the link's source or target, but not our cell id.
                return _.omit([link.get('source').id, link.get('target').id], cell.id)[0];
            }).each(function (group, key) {
                // If the member of the group has both source and target model adjust vertices.
                if (key !== 'undefined') adjustVertices(graph, _.first(group));
            }).value();

            return;
        }

        // The cell is a link. Let's find its source and target models.
        var srcId = cell.get('source').id || cell.previous('source').id;
        var trgId = cell.get('target').id || cell.previous('target').id;

        // If one of the ends is not a model, the link has no siblings.
        if (!srcId || !trgId) return;

        var siblings = _.filter(graph.getLinks(), function (sibling) {

            var _srcId = sibling.get('source').id;
            var _trgId = sibling.get('target').id;

            return (_srcId === srcId && _trgId === trgId) || (_srcId === trgId && _trgId === srcId);
        });

        switch (siblings.length) {

            case 0:
                // The link was removed and had no siblings.
                break;

            case 1:
                // There is only one link between the source and target. No vertices needed.
                cell.unset('vertices');
                break;

            default:

                // There is more than one siblings. We need to create vertices.

                // First of all we'll find the middle point of the link.
                var srcCenter = graph.getCell(srcId).getBBox().center();
                var trgCenter = graph.getCell(trgId).getBBox().center();
                var midPoint = g.line(srcCenter, trgCenter).midpoint();

                // Then find the angle it forms.
                var theta = srcCenter.theta(trgCenter);

                // This is the maximum distance between links
                var gap = 20;

                _.each(siblings, function (sibling, index) {

                    // We want the offset values to be calculated as follows 0, 20, 20, 40, 40, 60, 60 ..
                    var offset = gap * Math.ceil(index / 2);

                    // Now we need the vertices to be placed at points which are 'offset' pixels distant
                    // from the first link and forms a perpendicular angle to it. And as index goes up
                    // alternate left and right.
                    //
                    //  ^  odd indexes 
                    //  |
                    //  |---->  index 0 line (straight line between a source center and a target center.
                    //  |
                    //  v  even indexes
                    var sign = index % 2 ? 1 : -1;
                    var angle = g.toRad(theta + sign * 90);

                    // We found the vertex.
                    var vertex = g.point.fromPolar(offset, angle, midPoint);

                    sibling.set('vertices', [{ x: vertex.x, y: vertex.y }]);
                });
        }
    };

    var buildGraph = function (json, statisticValue) {
        statisticValue = statisticValue || 'total';

        var points = json.points;
        var arrows = json.arrows;

        var unitSize = 250;

        var maxXY = calcSize(points);

        var width = (maxXY[1] + 1) * unitSize;
        var height = (maxXY[0] + 1) * unitSize;

        var graph = new joint.dia.Graph;
        var paper = new joint.dia.Paper({ el: $('#paper'), width: width, height: height, model: graph, linkConnectionPoint: joint.util.shapePerimeterConnectionPoint });

        var graphElements = [];
        var graphLinks = [];
        var pointMap = {};

        for (var i = 0; i < points.length; i++) {
            var thePoint = points[i];
            var id = thePoint['id'];
            var pointName = Math.round(thePoint[statisticValue]) + '\n' + thePoint['applicationName'] + '\n' + regexName(thePoint['methodUri']);
            var xPosition = (thePoint['y']-1) * unitSize;
            var yPosition = (thePoint['x']-1) * unitSize;
            var item = me(graph, id, pointName, xPosition, yPosition);
            graphElements.push(item);
            pointMap[thePoint['name']] = item;

        }

        for (var i = 0; i < arrows.length; i++) {
            var theArrow = arrows[i];
            var link = ml(graph, theArrow['id'], Math.round(theArrow[statisticValue]), pointMap[theArrow['fromPointName']], pointMap[theArrow['toPointName']]);
            graphLinks.push(link);

        }

        var myAdjustVertices = _.partial(adjustVertices, graph);

        // adjust vertices when a cell is removed or its source/target was changed
        graph.on('add remove change:source change:target', myAdjustVertices);

        // also when an user stops interacting with an element.
        paper.on('cell:pointerup', myAdjustVertices);

        var cells = graphElements.concat(graphLinks);
        graph.addCells(cells);
        // graph.resetCells(cells);

        // joint.layout.DirectedGraph.layout(graph, {
        //     setLinkVertices: false
        // });
    }

    $('.route-value').click(function (event) {
        var statisticValue = event.target.value;
        buildGraph(graphJson, statisticValue);
    })

    $.ajax({

        // The URL for the request
        url: "http://10.10.17.85:8080/graph",

        // The data to send (will be converted to a query string)
        // data: {
        //     id: 123
        // },

        // Whether this is a POST or GET request
        type: "GET",

        // The type of data we expect back
        dataType: "json"
    })
        // Code to run if the request succeeds (is done);
        // The response is passed to the function
        .done(function (json) {
            graphJson = json;
            console.log(json);
            buildGraph(json);
        })
        // Code to run if the request fails; the raw request and
        // status codes are passed to the function
        .fail(function (xhr, status, errorThrown) {
            console.log("Error: " + errorThrown);
            console.log("Status: " + status);
            console.dir(xhr);
        })
        // Code to run regardless of success or failure;
        .always(function (xhr, status) {
            console.log("The request is complete!");
        });
})