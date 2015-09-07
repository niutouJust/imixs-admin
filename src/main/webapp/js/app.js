"use strict";

var benJS = BENJS.org.benjs.core;

function layoutSection(templ, context) {
	// $(context).i18n();
	// $(context).imixsLayout();
	$("#imixs-error").hide();
};

/*******************************************************************************
 * 
 * MODELS
 * 
 ******************************************************************************/

var RestService = function() {
	this.baseURL = "http://localhost:8080/backlog-rest";
	this.indexList = null;
};

/* WorklistController */
var Worklist = function() {
	this.query = "SELECT entity FROM Entity entity where entity.type='workitem' ORDER BY entity.modified DESC";
	this.view;
	this.start = 0;
	this.count = 10;
	this.fieldName = "";
	this.fieldType = "";
	this.newValue = "";
	this.$activityid = 0;
};

/* WorklistController */
var Workitem = function(itemarray) {
	ItemCollection.call(this, itemarray);
	this.id = '';

	/* return summary or txtname */
	this.getSummary = function() {
		var val = this.getItem("txtworkflowsummary");
		if (!val)
			val = this.getItem("txtname");
		return val;
	}

	/*
	 * return all items sorted by name and provides a index item if the field
	 * has an Imixs-Entity-Index
	 */
	this.getSortedItemlist = function() {

		// add index type and indexIcon
		$.each(this.item, function(index, aitem) {
			aitem.index = restServiceController.model.indexList[aitem.name];
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

};
// Workitem.prototype = new ItemCollection();

/*******************************************************************************
 * 
 * CONTROLLERS
 * 
 ******************************************************************************/

var restServiceController = benJS.createController({
	id : "restServiceController",
	model : new RestService()
});

var worklistController = benJS.createController({
	id : "worklistController",
	model : new Worklist()
});

var workitemController = benJS.createController({
	id : "workitemController",
	model : new Workitem()
});

restServiceController.connect = function() {
	this.pull();

	// read indexlist...
	$.ajax({
		type : "GET",
		url : this.model.baseURL + "/entity/indexlist",
		dataType : "json",
		success : function(response) {

			restServiceController.model.indexList = response.map;
			QueryRoute.route();
		},
		error : function(jqXHR, error, errorThrown) {

			message = errorThrown;
			$("#error-message").text(message);
			$("#imixs-error").show();
		}
	});

	// QueryRoute.route();
}
/* Custom method to load a worklist */
worklistController.loadWorklist = function() {
	worklistController.pull();
	console.debug("load worklist: '" + worklistController.model.query + "'...");

	var url = restServiceController.model.baseURL;
	url = url + "/entity/entitiesbyquery/" + worklistController.model.query;
	url = url + "?start=" + worklistController.model.start + "&count="
			+ worklistController.model.count;

	$.ajax({
		type : "GET",
		url : url,
		dataType : "xml",
		success : function(response) {
			var json = xml2json(response);

			worklistController.model.view = json.collection.entity;
			QueryRoute.route();
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
	url = url + "/workflow/worklistbyquery/" + worklistController.model.query;
	url = url + "?start=" + worklistController.model.start + "&count="
			+ worklistController.model.count;

	$.ajax({
		type : "GET",
		url : url,
		dataType : "xml",
		success : function(response) {
			var json = xml2json(response);

			worklistController.model.view = json.collection.entity;

			printLog("Start processing " + worklistController.model.view.length
					+ " workitems", true);

			// var itemCol=new ItemCollection();
			$.each(worklistController.model.view, function(index, entity) {
				var workitem = new Workitem(entity);
				var uniqueid = workitem.getItem('$uniqueid');
				// printLog(".", true);

				// construct workitem to be processed....
				var updatedWorkitem = new Workitem();

				updatedWorkitem.setItem("$uniqueid", uniqueid, "xs:string");
				updatedWorkitem.setItem("$activityid",
						worklistController.model.$activityid, "xs:int");

				updatedWorkitem.setItem(worklistController.model.fieldName,
						worklistController.model.newValue,
						worklistController.model.fieldType);

				// console.debug("xml=", json2xml(processWorkitem));
				workitemController.processWorkitem(updatedWorkitem);
			});

		},
		error : function(jqXHR, error, errorThrown) {

			message = errorThrown;
			$("#error-message").text(message);
			$("#imixs-error").show();
		}
	});

}

/* Custom method to process a single workitem */
workitemController.processWorkitem = function(workitem) {

	var xmlData = json2xml(workitem);
	console.debug(xmlData);
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
			var json = xml2json(jqXHR.responseXML);
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

}

/* Custom method to load a single workite */
workitemController.loadWorkitem = function(context) {

	var entry = $('span', context);
	if (entry.length == 1) {

		var id = $(entry).text();

		workitemController.model.id = id;
	}

	console.debug("load workitem: '" + workitemController.model.id + "'...");

	var url = restServiceController.model.baseURL;
	url = url + "/workflow/workitem/" + workitemController.model.id;

	$.ajax({
		type : "GET",
		url : url,
		dataType : "xml",
		success : function(response) {
			console.debug(response);
			var json = xml2json(response);

			// workitemController.model.entity = json.entity;
			workitemController.model.item = json.entity.item;
			WorkitemRoute.route();
		},
		error : function(jqXHR, error, errorThrown) {

			message = errorThrown;
			$("#error-message").text(message);
			$("#imixs-error").show();
		}
	});

}

/*******************************************************************************
 * 
 * ROUTES & TEMPLATES
 * 
 ******************************************************************************/
var RestServiceRoute = benJS.createRoute({
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

});

var QueryRoute = benJS.createRoute({
	id : "query-route",
	templates : {
		"content" : "view_query.html"
	},
	afterRoute : function(router) {
		$("#imixs-nav ul li").removeClass('active');
		$("#imixs-nav ul li:nth-child(2)").addClass('active');
	}
});

var WorkitemRoute = benJS.createRoute({
	id : "workitem-route",
	templates : {
		"content" : "view_workitem.html"
	},
	afterRoute : function(router) {
		$("#imixs-nav ul li").removeClass('active');
		$("#imixs-nav ul li:nth-child(2)").addClass('active');
	}
});

var bulkUpdateRoute = benJS.createRoute({
	id : "bulkupdate-route",
	templates : {
		"content" : "view_bulkupdate.html"
	},
	afterRoute : function(router) {
		$("#imixs-nav ul li").removeClass('active');
		$("#imixs-nav ul li:nth-child(3)").addClass('active');
	}
});

var contentTemplate = benJS.createTemplate({
	id : "content",
	afterLoad : layoutSection
});

function printLog(message, noLineBrake) {
	console.debug(message);

	$("#imixs-log #log-message").append(message);
	if (!noLineBrake)
		$("#imixs-log #log-message").append("<br />");
}

function clearLog(message, noLineBrake) {

	$("#imixs-log #log-message").empty();
}

$(document).ready(function() {

	// start view
	benJS.start({
		"loadTemplatesOnStartup" : false
	});

	RestServiceRoute.route();
	$("#imixs-error").hide();

});