
if (typeof com == "undefined") { com = {}; }

(function() {

// package com.github;
com.github = com.github || {};

/**
 * Repository constructor with repository name, user name and analysis mode.
 */
com.github.Repository = function(repoName, user, analysisMode) {
	this.name = repoName;
	this.owner = user;
	this.analysis = analysisMode;
};

/**
 * Repository class definition.
 */
com.github.Repository.prototype = {
	name: null,
    owner: null,
    analysis: null,
    nethash: null,
    contributors: null,

	/**
	 * Returns the url of the repository page according to its name, its user and the 
	 * requiered analysis. This method is defined for an internal use to build and return
	 * each specialized url.
	 */
	getUrl: function(analysis) {
		var url = 'repo.html?user=' + this.owner + '&repo=' + this.name;
		if (analysis != null) { url += '&analysis=' + analysis; }
		return url;
	},
	
	/**
	 * Returns the url of this repository giving access to a page which shows all the 'commiters'
	 * of the project.
	 */
	committersUrl: function() { return this.getUrl(COMMITTERS); },
	
	/**
	 * Returns the url of this repository giving access to a page which shows the impact of
	 * each user on the project based on the last 100 commits.
	 */
	impactUrl: function() { return this.getUrl(IMPACT); },

	/**
	 * Returns the url of this repository giving access to a page which shows the projection of
	 * the last 100 commits on a timeline.
	 */
	timelineUrl: function() { return this.getUrl(TIMELINE); },

	searchUrl: function() { return 'index.html'; },
	
	isCommittersAnalysis: function() { return this.analysis == COMMITTERS; },
	
	isImpactAnalysis: function() { return this.analysis == IMPACT; },

	isTimelineAnalysis: function() { return this.analysis == TIMELINE; },

	showContributors: function(displayContributor, listId, postFunction) {
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
					if (contributor.name == null || contributor.name == '') {
						contributor.name = contributor.login;
					}
					if (contributor.type == null || contributor.type == '') {
						contributor.type = 'anonymous';
					}
					displayContributor(contributor, listId, i);
				});
				postFunction();
			}
		});
	},


//	sortCommitsByContributionCount: function(commits) {
//		commits.sort(function(firstCommit, secondCommit) {
//			return firstCommit.commitCount - secondCommit.commitCount;
//		});
//	},

	sortedCommits: function(showFunction, sortFunction, elementId) {
	    com.github.utils.loadCommits(this, function(rowData) {
			var commits = sortFunction(rowData);
			showFunction(commits, elementId);
		});
	},
	
	commitsByUser: function(showFunction, elementId) {
		this.sortedCommits(showFunction,
				           function(rowData) { return com.github.utils.sortCommitsByUser(rowData); },
				           elementId);
	},
	
	commitsByDate: function(showFunction, elementId) {
		this.sortedCommits(showFunction,
				           function(rowData) { return com.github.utils.sortCommitsByDate(rowData); },
				           elementId);
	},
	
};

var COMMITTERS = 'committers',
	IMPACT = 'impact',
	TIMELINE = 'timeline',
	MAX_COMMIT_COUNT = 100;


// package com.github.utils;
com.github.utils = {
// This package contains all the utility services that manipulates a Repository

	/**
	 * Gets all the repository information according to the supplied search query.
	 */
    searchRepository: function(query, displayRepository, postFunction) {
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
		
	loadCommits: function(repository, postTreatment) {
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
				self.loadCommitsFromNethash(repository, postTreatment);
			}
		});
	},
			
	loadCommitsFromNethash: function(repository, postTreatment) {
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
				postTreatment(data.commits);
			}
		});
	},

	newCommit: function(currentData) {
		var type = 'User';
		var login = currentData.login;
		if (login == '') {
			login = currentData.author;
			type = 'Anonymous';
		}
		var commit = {
			user: currentData.author,
			login: login,
			type: type,
			commitCount: 1,
			date: currentData.date,
			gravatar: currentData.gravatar
		};
		return commit;
	},
	
	/**
	 * Returns and caches all the contributors based on the last 100 commits.
	 */
	sortCommits: function(rowData, key) {
		var	commits = [];
		var commitCount = Math.min(MAX_COMMIT_COUNT, rowData.length);
		for (var i = 0; i < commitCount; i++) {
			var currentData = rowData[i];
			var currentKey = key(currentData);
			var commit = commits[currentKey];
			if (commit == null) {
				commits[currentKey] = self.newCommit(currentData);
			}
			else { commit.commitCount++; }
		}
		return commits;
	},

	/**
	 * Returns and caches all the contributors based on the last 100 commits.
	 */
	sortCommitsByUser: function(rowData) {
		return self.sortCommits(rowData, function(data) { return data.author; });
	},

	/**
	  * Returns all the commits, indexed by dates, based on the last 100 commits.
	  */
	sortCommitsByDate: function(rowData) {
		return self.sortCommits(rowData, function(data) { return data.date.substring(0, 10); });
	}

};

var self = com.github.utils;
	
})();
