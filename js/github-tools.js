
if (typeof com == "undefined") { com = {}; }

(function() {
com.github = com.github || {};

// constructor
com.github.Repository = function() {
	var readParams = [];
	var query = window.location.search.substring(1);
	var params = query.split('&');
	for (var i=0; i<params.length; i++) {
		var param = params[i].split('=');
		if (param.length > 0) {
			var key = param[0];
			var value = param[1];
			readParams[key] = value;
		}
	}
    this.name = readParams['repo'];
    this.owner = readParams['user'];
    
    com.github.utils.loadCommits(this);
};

com.github.Repository.prototype = {
	name: null,
    owner: null,
    nethash: null,
    contributors: null,
    Commits: {
        rowData: null,
        commitsByUser: null,
        commitsByDate: null
    },


	showContributors: function(displayContributor, postFunction) {
		var url = 'http://github.com/api/v2/json/repos/show/' +
                this.owner +
                '/' +
                this.name +
                '/contributors/anon';
		$.ajax({
			url: url,
			dataType: 'jsonp',
			success: function(data) {
				var contributors = data.contributors;
				contributors.sort(function(firstContributor, secondContributor) {
					return secondContributor.contributions - firstContributor.contributions;
				});
				
				$.each(contributors, function(i, contributor) {
					// Some User does not have defined name, set the login as name
					if (contributor.name === null || contributor.name === '') {
						contributor.name = contributor.login;
					}
					if (contributor.type === null || contributor.type === '') {
						contributor.type = 'anonymous';
					}
					displayContributor(contributor, i);
				});
				postFunction();
			}
		});
	},


	sortCommitsByContributionCount: function(commits) {
		commits.sort(function(firstCommit, secondCommit) {
			return firstCommit.commitCount - secondCommit.commitCount;
		});
	},

	newCommit: function(currentData) {
		var login = currentData.login;
		if (login === '') { login = currentData.author; }
		var commit = {
			user: currentData.author,
			login: login,
			commitCount: 1,
			date: currentData.date,
			gravatar: currentData.gravatar
		};
		return commit;
	},
	
	/**
	 * Returns and caches all the contributors based on the last 100 commits.
	 */
	getCommitsByUser: function() {
		var	commits = this.Commits.commitsByUser;
		if (commits === null) {
			commits = [];
			var rowData = this.Commits.rowData;
			var commitCount = Math.min(MAX_COMMIT_COUNT, rowData.length);
			for (var i = 0; i < commitCount; i++) {
				var currentData = rowData[i];
				var commit = commits[currentData.author];
				if (commit === null) {
					commits[currentData.author] = this.newCommit(currentData);
				}
				else { commit.commitCount++; }
			}
			
			// And caches the result
			this.Commits.commitsByUser = commits;
		}
		return commits;
	},

	/**
	  * Returns all the commits, indexed by dates, based on the last 100 commits.
	  */
	getCommitsByDate: function() {
		var	commits = this.Commits.commitsByDate;
		if (commits === null) {
			commits = [];
			var rowData = this.Commits.rowData;
			var commitCount = Math.min(MAX_COMMIT_COUNT, rowData.length);
			for (var i = 0; i < commitCount; i++) {
				var currentData = rowData[i];
				var dateAsDay = currentData.date.substring(0, 10);
				var commit = commits[dateAsDay];
				if (commit === null) {
					commits[dateAsDay] = this.newCommit(currentData);
				}
				else { commit.commitCount++; }
			}
			this.Commits.commitsByDate = commits;
		}
		return commits;
	}

};

var self = com.github.Repository,
	MAX_COMMIT_COUNT = 100;

com.github.utils = {
    searchRepository: function(displayRepository, postFunction) {
        var query = document.getElementById('searchText').value;
        var url = 'http://github.com/api/v2/json/repos/search/' + query;

        $.ajax({
            url: url,
            dataType: 'jsonp',
            success: function(data) {
                $.each(data.repositories, function(i, repository) {
                    displayRepository(repository, i);
                });
                postFunction();
            }
        });
    },
		
	loadCommits: function(repository) {
		var url = 'http://github.com/' +
            repository.owner +
            '/' +
            repository.name +
            '/network_meta';
		$.ajax({
			url: url,
			dataType: 'jsonp',
			success: function(data) {
				repository.nethash = data.nethash;
				com.github.utils.loadCommitsFromNethash(repository);
			}
		});
	},
			
	loadCommitsFromNethash: function(repository) {
		var url = 'http://github.com/' +
                repository.owner +
                '/' +
                repository.name +
                '/network_data_chunk?nethash=' +
                repository.nethash;
		$.ajax({
			url: url,
			dataType: 'jsonp',
			success: function(data) {
				data.commits.sort(function(firstCommit, secondCommit) {
					var comparison = null;
					if (firstCommit.date < secondCommit.date) { comparison = 1; }
					else if (firstCommit.date == secondCommit.date) { comparison = 0; }
					else { comparison = -1; }
					return comparison;
				});
				repository.Commits.rowData = data.commits;
			}
		});
	}
};

})();
