"use strict";

// define namespace
IMIXS.namespace("org.imixs.workflow.adminclient");

// define core module
IMIXS.org.imixs.workflow.adminclient = (function() {
	if (!BENJS.org.benjs.core) {
		console.error("ERROR - missing dependency: benjs.js");
	}
	if (!IMIXS.org.imixs.core) {
		console.error("ERROR - missing dependency: imixs-core.js");
	}
	if (!IMIXS.org.imixs.xml) {
		console.error("ERROR - missing dependency: imixs-xml.js");
	}

	var benJS = BENJS.org.benjs.core, imixs = IMIXS.org.imixs.core, imixsXML = IMIXS.org.imixs.xml,
	/***************************************************************************
	 * 
	 * MODELS
	 * 
	 **************************************************************************/

	RestService = function() {
		this.baseURL = "http://localhost:8080/office-rest";
		this.indexMap = null;
		this.indexName = null;
		this.indexType = null;

		/* returns an 2 dimensional array of the index map */
		this.getIndexList = function() {
			var result = new Array();
			var entry;
			for ( var property in this.indexMap) {
				var sonderding = {
					name : property,
					type : this.indexMap[property]
				};
				result.push(sonderding);

			}

			return result;
		}
	},

	/* WorklistController */
	Worklist = function() {
		this.query = "SELECT entity FROM Entity entity where entity.type='workitem' ORDER BY entity.modified DESC";
		this.view;
		this.start = 0;
		this.count = 10;
		this.fieldName = "";
		this.fieldType = "";
		this.newValue = "";
		this.$activityid = 0;
	},

	/* WorklistController */
	Workitem = function(itemarray) {
		imixs.ItemCollection.call(this, itemarray);
		this.id = '';

		/* return summary or txtname */
		this.getSummary = function() {
			var val = this.getItem("txtworkflowsummary");
			if (!val)
				val = this.getItem("txtname");
			return val;
		}

		/*
		 * return all items sorted by name and provides a index item if the
		 * field has an Imixs-Entity-Index
		 */
		this.getSortedItemlist = function() {

			// add index type and indexIcon
			$.each(this.item, function(index, aitem) {
				aitem.index = restServiceController.model.indexMap[aitem.name];
				if ((typeof aitem.index) == 'number') {
					var iconTitle = "";
					if (aitem.index == 0)
						iconTitle = "Text Index";
					else if (aitem.index == 1)
						iconTitle = "Integer Index";
					else if (aitem.index == 2)
						iconTitle = "Double Index";
					else if (aitem.index == 3)
						iconTitle = "Calendar Index";
					aitem.indexIcon = "<img src='img/index_typ_" + aitem.index
							+ ".gif' title='" + iconTitle + "' />";
				}
			});

			// sort list
			return this.item.sort(function(a, b) {
				if (a.name > b.name)
					return 1;
				else if (a.name < b.name)
					return -1;
				else
					return 0;
			});
		}

	},

	/***************************************************************************
	 * 
	 * CONTROLLERS
	 * 
	 **************************************************************************/

	restServiceController = benJS.createController({
		id : "restServiceController",
		model : new RestService()
	}),

	worklistController = benJS.createController({
		id : "worklistController",
		model : new Worklist()
	}),

	workitemController = benJS.createController({
		id : "workitemController",
		model : new Workitem()
	}),

	/***************************************************************************
	 * 
	 * ROUTES & TEMPLATES
	 * 
	 **************************************************************************/
	restServiceRoute = benJS.createRoute({
		id : "restservice-route",
		templates : {
			"content" : "view_restservice.html"
		},
		beforeRoute : function(router) {
			restServiceController.pull();
		},
		afterRoute : function(router) {
			$("#imixs-nav ul li").removeClass('active');
			$("#imixs-nav ul li:nth-child(1)").addClass('active');
		}

	}),

	queryRoute = benJS.createRoute({
		id : "query-route",
		templates : {
			"content" : "view_query.html"
		},
		afterRoute : function(router) {
			$("#imixs-nav ul li").removeClass('active');
			$("#imixs-nav ul li:nth-child(2)").addClass('active');
		}
	}),

	indexRoute = benJS.createRoute({
		id : "index-route",
		templates : {
			"content" : "view_index.html"
		},
		afterRoute : function(router) {
			$("#imixs-nav ul li").removeClass('active');
			$("#imixs-nav ul li:nth-child(4)").addClass('active');
		}
	}),

	workitemRoute = benJS.createRoute({
		id : "workitem-route",
		templates : {
			"content" : "view_workitem.html"
		},
		afterRoute : function(router) {
			$("#imixs-nav ul li").removeClass('active');
			$("#imixs-nav ul li:nth-child(2)").addClass('active');
		}
	}),

	bulkUpdateRoute = benJS.createRoute({
		id : "bulkupdate-route",
		templates : {
			"content" : "view_bulkupdate.html"
		},
		afterRoute : function(router) {
			$("#imixs-nav ul li").removeClass('active');
			$("#imixs-nav ul li:nth-child(3)").addClass('active');
		}
	}),

	contentTemplate = benJS.createTemplate({
		id : "content",
		afterLoad : layoutSection
	}),

	/**
	 * Start the ben Application
	 */
	start = function() {
		console.debug("starting backlog application...");

		// start view
		benJS.start({
			"loadTemplatesOnStartup" : false
		});

		restServiceRoute.route();
		$("#imixs-error").hide();
	};

	/* Custom method to process a single workitem */
	workitemController.processWorkitem = function(workitem) {

		var xmlData = imixsXML.json2xml(workitem);
		// console.debug(xmlData);
		console.debug("process workitem: '" + workitem.getItem('$uniqueid')
				+ "'...");

		var url = restServiceController.model.baseURL;
		url = url + "/workflow/workitem/";

		$.ajax({
			type : "POST",
			url : url,
			data : xmlData,
			contentType : "text/xml",
			dataType : "xml",
			cache : false,
			error : function(jqXHR, error, errorThrown) {
				var message = errorThrown;
				var json = imixsXML.xml2json(jqXHR.responseXML);
				var workitem = new Workitem(json);
				workitemController.model.item = json.entity.item;
				var uniqueid = workitem.getItem('$uniqueid');
				var error_code = workitem.getItem('$error_code');
				var error_message = workitem.getItem('$error_message');

				printLog("<br />" + uniqueid + " : " + error_code + " - "
						+ error_message, true);

				$("#error-message").text("BulkUpdate failed");
				$("#imixs-error").show();
			},
			success : function(xml) {
				printLog(".", true);
			}
		});

	};

	/* Custom method to save a single workitem */
	workitemController.saveWorkitem = function(workitem) {

		var xmlData = imixsXML.json2xml(workitem);
		// console.debug(xmlData);
		console.debug("save workitem: '" + workitem.getItem('$uniqueid')
				+ "'...");

		var url = restServiceController.model.baseURL;
		url = url + "/entity/";

		$.ajax({
			type : "POST",
			url : url,
			data : xmlData,
			contentType : "text/xml",
			dataType : "xml",
			cache : false,
			error : function(jqXHR, error, errorThrown) {
				var message = errorThrown;
				var json = imixsXML.xml2json(jqXHR.responseXML);
				var workitem = new Workitem(json);
				workitemController.model.item = json.entity.item;
				var uniqueid = workitem.getItem('$uniqueid');
				var error_code = workitem.getItem('$error_code');
				var error_message = workitem.getItem('$error_message');

				printLog("<br />" + uniqueid + " : " + error_code + " - "
						+ error_message, true);

				$("#error-message").text("BulkUpdate failed");
				$("#imixs-error").show();
			},
			success : function(xml) {
				printLog(".", true);
			}
		});

	};

	/* Custom method to load a single workite */
	workitemController.loadWorkitem = function(context) {

		var entry = $('span', context);
		if (entry.length == 1) {

			var id = $(entry).text();

			workitemController.model.id = id;
		}

		console
				.debug("load workitem: '" + workitemController.model.id
						+ "'...");

		var url = restServiceController.model.baseURL;
		url = url + "/workflow/workitem/" + workitemController.model.id;

		$.ajax({
			type : "GET",
			url : url,
			dataType : "xml",
			success : function(response) {
				console.debug(response);
				var json = imixsXML.xml2json(response);

				// workitemController.model.entity = json.entity;
				workitemController.model.item = json.entity.item;
				workitemRoute.route();
			},
			error : function(jqXHR, error, errorThrown) {

				message = errorThrown;
				$("#error-message").text(message);
				$("#imixs-error").show();
			}
		});

	}

	/*
	 * Read the index list and open the query view
	 */
	restServiceController.connect = function() {
		this.pull();
		// read indexlist...
		$.ajax({
			type : "GET",
			url : this.model.baseURL + "/entity/indexlist",
			dataType : "json",
			success : function(response) {

				restServiceController.model.indexMap = response.map;
				queryRoute.route();
			},
			error : function(jqXHR, error, errorThrown) {

				message = errorThrown;
				$("#error-message").text(message);
				$("#imixs-error").show();
			}
		});
	}

	/*
	 * Updtes the index list and open the index view
	 */
	restServiceController.updateIndexlist = function() {
		this.pull();
		// read indexlist...
		$.ajax({
			type : "GET",
			url : this.model.baseURL + "/entity/indexlist",
			dataType : "json",
			success : function(response) {
				restServiceController.model.indexName = "";
				restServiceController.model.indexType = "";
				restServiceController.model.indexMap = response.map;
				indexRoute.route();
			},
			error : function(jqXHR, error, errorThrown) {
				$("#error-message").text(errorThrown);
				$("#imixs-error").show();
			}
		});
	}

	/* removes an index */
	restServiceController.removeIndex = function(context) {
		var entry = $(context).closest('[data-ben-entry]');
		var entryNo = $(entry).attr("data-ben-entry");

		var indexEntry = restServiceController.model.getIndexList()[entryNo];
		if (confirm('Delete Index ' + indexEntry.name + ' ?')) {
			var url = restServiceController.model.baseURL;
			url = url + "/entity/index/" + indexEntry.name;

			$.ajax({
				type : "DELETE",
				url : url,
				success : function(response) {
					restServiceController.updateIndexlist();
				},
				error : function(jqXHR, error, errorThrown) {
					$("#error-message").text("Unable to remove index");
					$("#imixs-error").show();
				}
			});
		}
	}

	/* removes an index */
	restServiceController.addIndex = function() {
		restServiceController.pull();
		if (confirm('Add new Index ' + this.model.indexName + ' ?')) {
			var url = restServiceController.model.baseURL;
			url = url + "/entity/index/" + this.model.indexName + "/"
					+ this.model.indexType;

			$.ajax({
				type : "PUT",
				url : url,
				success : function(response) {
					restServiceController.model.indexName = "";
					restServiceController.model.indexType = "";
					restServiceController.updateIndexlist();
				},
				error : function(jqXHR, error, errorThrown) {
					$("#error-message").text(
							"Unable to add index - wrong format");
					$("#imixs-error").show();
				}
			});
		}
	}

	/* Custom method to load a worklist */
	worklistController.loadWorklist = function() {
		worklistController.pull();
		console.debug("load worklist: '" + worklistController.model.query
				+ "'...");

		var url = restServiceController.model.baseURL;
		url = url + "/entity/entitiesbyquery/" + worklistController.model.query;
		url = url + "?start=" + worklistController.model.start + "&count="
				+ worklistController.model.count;

		$.ajax({
			type : "GET",
			url : url,
			dataType : "xml",
			success : function(response) {
				var json = imixsXML.xml2json(response);

				worklistController.model.view = json.collection.entity;
				queryRoute.route();
			},
			error : function(jqXHR, error, errorThrown) {

				message = errorThrown;
				$("#error-message").text(message);
				$("#imixs-error").show();
			}
		});

	}

	/**
	 * Bulk Update - processes a selection of workitems and updates a field
	 * information
	 * 
	 */
	worklistController.bulkUpdate = function() {
		worklistController.pull();
		clearLog();
		printLog("Load worklist: '" + worklistController.model.query + "'...");

		var url = restServiceController.model.baseURL;
		url = url + "/entity/entitiesbyquery/" + worklistController.model.query;
		url = url + "?start=" + worklistController.model.start + "&count="
				+ worklistController.model.count;

		$.ajax({
			type : "GET",
			url : url,
			dataType : "xml",
			success : function(response) {
				var json = imixsXML.xml2json(response);

				worklistController.model.view = json.collection.entity;

				printLog("Start processing "
						+ worklistController.model.view.length + " workitems",
						true);

				// var itemCol=new ItemCollection();
				$.each(worklistController.model.view,
						function(index, entity) {
							var workitem = new Workitem(entity);
							var uniqueid = workitem.getItem('$uniqueid');
							// printLog(".", true);

							// construct workitem to be
							// processed....
							var updatedWorkitem = new Workitem();

							updatedWorkitem.setItem("$uniqueid", uniqueid,
									"xs:string");

							updatedWorkitem.setItem(
									worklistController.model.fieldName,
									worklistController.model.newValue,
									worklistController.model.fieldType);

							// process or save the workitem?
							if (worklistController.model.$activityid > 0) {
								// set activityID
								updatedWorkitem.setItem("$activityid",
										worklistController.model.$activityid,
										"xs:int");
								workitemController
										.processWorkitem(updatedWorkitem);
							} else {
								// save entity
								workitemController
										.saveWorkitem(updatedWorkitem);
							}

						});

			},
			error : function(jqXHR, error, errorThrown) {
				$("#error-message").text(errorThrown);
				$("#imixs-error").show();
			}
		});

	}

	// public API
	return {
		Workitem : Workitem,
		restServiceRoute : restServiceRoute,
		restServiceController : restServiceController,
		worklistController : worklistController,
		workitemController : workitemController,
		queryRoute : queryRoute,
		bulkUpdateRoute : bulkUpdateRoute,
		indexRoute : indexRoute,
		start : start
	};

}());

function layoutSection(templ, context) {
	// $(context).i18n();
	// $(context).imixsLayout();
	$("#imixs-error").hide();
};

function printLog(message, noLineBrake) {
	console.debug(message);

	$("#imixs-log #log-message").append(message);
	if (!noLineBrake)
		$("#imixs-log #log-message").append("<br />");
}

function clearLog(message, noLineBrake) {

	$("#imixs-log #log-message").empty();
}
