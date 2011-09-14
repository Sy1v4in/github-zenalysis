google.load("visualization", "1", {
    packages: ["treemap"]
});
if (typeof com == "undefined") {
    com = {};
}(function() {
    com.github = com.github || {};

    com.github.ui = {
        span: function(spanId, spanContent) {
            var span = $('<span/>', {
                'id': 'detail-' + spanId,
                html: spanContent
            });
            return span;
        },

        div: function(divId, divContent) {
            var div = $('<div/>', {
                'id': 'detail-' + divId,
                html: divContent
            });
            return div;
        },

        analysisAnchor: function(repository, anchorContent) {
            var anchor = $('<a/>', {
                'id': 'detail-a-analysis',
                'class': 'button',
                'href': 'repo.html?user=' + repository.owner + '&repo=' + repository.name,
                html: anchorContent
            });
            return anchor;
        },

        addDetailResult: function(repository, index) {
            var details = $("#result-details");
            var detailDiv = $('<div/>', {
                'id': 'repo' + index,
                'class': 'result-detail' + ((index === 0) ? ' active' : '')
            });
            detailDiv.append(self.span('name', repository.name));
            detailDiv.append(' | ');
            detailDiv.append(self.span('owner', repository.owner));
            detailDiv.append(self.div('lang', repository.language));
            detailDiv.append(self.div('desc', repository.description));
            var watcherSpan = self.span('watchers', repository.watchers);
            var forkSpan = self.span('forks', repository.forks);
            detailDiv.append(self.div('more', 'This repository has ' + watcherSpan.text() + ' watcher(s) and ' + forkSpan.text() + ' fork(s). If you would like more information about this repository, please visite ' + repository.name + ' repository on <a href="http://github.com/' + repository.owner + '/' + repository.name + '">github</a>.'));
            detailDiv.append(self.analysisAnchor(repository, repository.name + ' analysis'));
            details.append(detailDiv);
        },

        addShortResult: function(repository, index) {
            var anchor = $('<a/>', {
                'href': '#repo' + index,
                html: repository.name
            });
            var span = $('<div/>', {
                'id': 'repotext',
                html: '<b>' + repository.owner + '</b> | ' + repository.forks + ' forks | ' + repository.watchers + ' watchers'
            });
            var li = $('<li/>', {
                'class': ((index === 0) ? 'active' : 'inactive')
            });
            $(".list").append(li.append($('<h2/>').append(anchor)));
            li.append(span);
        },

        showRepository: function(repository, index) {
            self.addShortResult(repository, index);
            self.addDetailResult(repository, index);
        },

        committerLi: function(contributor) {
            var contributorName = contributor.name;
            var contributorLogin = contributor.login;
            if (contributorName == null || contributorName == '') {
                contributorName = contributorLogin;
            }
            var contributorType = contributor.type;
            if (contributorType == null || contributorType == '') {
                contributorType = 'anonymous';
            }
            var li = $('<li/>', {
                'class': contributorType
            });
            li.append($('<img/>', {
                'class': 'gravatar',
                'src': 'http://www.gravatar.com/avatar/' + contributor.gravatar_id + '?s=48'
            }));
            var loginAndName = null;
            if (contributorType == 'anonymous') {
                loginAndName = '<em>' + contributor.name + '</em>';
            }
            else {
                loginAndName = '<a href="http://github.com/' + contributor.login + '">' + contributor.login + '</a> ' + '<em>(' + contributor.name + ')</em>';
            }
            li.append(self.div('contributor-login', loginAndName));
            if (contributor.blog !== null && contributor.blog != 'undefined') {
                var anchor = $('<a/>', {
                    'href': contributor.blog,
                    html: contributor.blog
                });
                li.append(self.div('contributor-blog').append(anchor));
            }
            if (contributor.location != null && contributor.location != 'undefined') {
                li.append(self.div('location', contributor.location));
                li.append(self.div('separator', ' | '));
            }
            li.append(self.div('contribution-count', '<strong>' + contributor.contributions + '</strong> commit(s)'));
            return li;
        },
        
        showCommitor: function(committer) {
            $("#result-list .list").append(self.committerLi(committer));
        },
        
        showCommittersAsTreeMap: function(commitsByUser, divId) {
            var dataTable = new google.visualization.DataTable();
            dataTable.addColumn('string', 'Name');
            dataTable.addColumn('string', 'parent');
            dataTable.addColumn('number', 'Contribution count (size)');
            
            dataTable.addRow(['Committers', null, 0]);
            dataTable.addRow(['Anonymous', 'Committers', 0]);
            dataTable.addRow(['User', 'Committers', 0]);
            
            for (var committerIndex in commitsByUser) {
                var committer = commitsByUser[committerIndex];
                dataTable.addRow([committer.user, committer.type, committer.commitCount]);
            }
            // Create and draw the visualization.
            var elt = document.getElementById(divId);
            var tree = new google.visualization.TreeMap(elt);
            tree.draw(dataTable, {
                minColor: '#4676af',
                midColor: '#ddd',
                maxColor: '#9dde74',
                headerHeight: 15,
                fontColor: 'black',
                showScale: true
            });
        },
        
        showCommitsOnTimeline: function(commits, containerId) {
            var data = [];
            var commitCount = 0;
            var commitIndex = 0;
            for (var dateIndex in commits) {
                var commit = [new Date(dateIndex).getTime(), commits[dateIndex].commitCount];
                data[commitIndex] = commit;
                commitIndex++;
                commitCount += commits[dateIndex].commitCount;
            }

            function weekendAreas(axes) {
                var markings = [];
                var d = new Date(axes.xaxis.min);
                // go to the first Saturday
                d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7));
                d.setUTCSeconds(0);
                d.setUTCMinutes(0);
                d.setUTCHours(0);
                var i = d.getTime();
                do {
                    // when we don't set yaxis, the rectangle automatically
                    // extends to infinity upwards and downwards
                    markings.push({
                        xaxis: {
                            from: i,
                            to: i + 2 * 24 * 60 * 60 * 1000
                        }
                    });
                    i += 7 * 24 * 60 * 60 * 1000;
                }
                while (i < axes.xaxis.max);
                return markings;
            }
            var placeholderId = $('<div/>', {
                'id': 'visualization'
            });
            placeholderId.appendTo($(containerId));
            var overviewId = $('<div/>', {
                'id': 'overview'
            });
            overviewId.appendTo($(containerId));
            var overviewLegendId = $('<div/>', {
                'id': 'overviewLegend'
            });
            overviewLegendId.appendTo($(containerId));
            var options = {
                legend: {
                    show: true,
                    container: overviewLegendId
                },
                bars: {
                    show: true,
                    fill: true,
                    barWidth: 24 * 60 * 60 * 1000
                },
                xaxis: {
                    mode: "time",
                    tickLength: 5,
                    zoomRange: [0.1, 10]
                },
                selection: {
                    mode: "x"
                },
                zoom: {
                    interactive: true
                },
                grid: {
                    markings: weekendAreas
                }
            };
            var serie = {
                data: data,
                label: "last " + commitCount + " commits",
                color: "#aaa"
            };
            var plot = $.plot($(placeholderId), [serie], options);
            $(placeholderId).bind('plotzoom', function(event, plot) {
                var axes = plot.getAxes();
                $(".message").html("Zooming to x: " + axes.xaxis.min.toFixed(2) + " &ndash; " + axes.xaxis.max.toFixed(2) + " and y: " + axes.yaxis.min.toFixed(2) + " &ndash; " + axes.yaxis.max.toFixed(2));
            });
            // setup overview
            var overview = $.plot($(overviewId), [{
                data: data,
                color: "#aaa"
            }], {
                bars: {
                    show: true,
                    fill: true
                },
                xaxis: {
                    ticks: [],
                    mode: "time"
                },
                yaxis: {
                    ticks: [],
                    min: 0,
                    autoscaleMargin: 0.1
                },
                selection: {
                    mode: "x"
                },
                grid: {
                    markings: weekendAreas
                }
            });
            // now connect the two
            $(placeholderId).bind("plotselected", function(event, ranges) {
                // do the zooming
                plot = $.plot($(placeholderId), [serie], $.extend(true, {}, options, {
                    xaxis: {
                        min: ranges.xaxis.from,
                        max: ranges.xaxis.to
                    }
                }));
                // don't fire event on the overview to prevent eternal loop
                overview.setSelection(ranges, true);
            });
            $(overviewId).bind("plotselected", function(event, ranges) {
                plot.setSelection(ranges);
            });
        }
    };
    var self = com.github.ui;
})();