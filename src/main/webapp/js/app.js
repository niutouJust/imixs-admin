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
};

/* WorklistController */
var Worklist = function() {
	this.query = "SELECT entity FROM Entity entity ORDER BY entity.modified DESC";
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
	ItemCollection.call(this,itemarray);
	this.id = '';

	/* return summary or txtname */
	this.getSummary = function() {
		var val = this.getItem( "txtworkflowsummary");
		if (!val)
			url = this.getItem( "txtname");
		return val;
	}
		
	/* return all items sorted by name */
	this.getSortedItemlist = function() {

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
//Workitem.prototype = new ItemCollection();

/*******************************************************************************
 * 
 * CONTROLLERS
 * 
 ******************************************************************************/

var restServiceController = benJS.createController("restServiceController",
		new RestService());
var worklistController = benJS.createController("worklistController",
		new Worklist());
var workitemController = benJS.createController("workitemController",
		new Workitem());

restServiceController.connect = function() {
	this.pull();
	QueryRoute.route();
}
/* Custom method to load a worklist */
worklistController.loadWorklist = function() {
	worklistController.pull();
	console.debug("load worklist: '" + worklistController.model.query + "'...");

	var url = restServiceController.model.baseURL;
	url = url + "/workflow/worklistbyquery/" + worklistController.model.query;
	url = url + "?start=" + worklistController.model.start + "&count="
			+ worklistController.model.count;

	$.ajax({
		type : "GET",
		url : url,
		dataType : "xml",
		success : function(response) {
			json = xml2json(response);

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
			json = xml2json(response);

			worklistController.model.view = json.collection.entity;

			printLog("Start processing " + worklistController.model.view.length
					+ " workitems", true);

			// var itemCol=new ItemCollection();
			$.each(worklistController.model.view, function(index, entity) {
				var workitem = new Workitem(entity);
				var uniqueid = workitem.getItem(entity, '$uniqueid');
				printLog(".", true);

				// construct workitem to be processed....
				var processWorkitem = new Workitem();
				valueObj = {
					"name" : "$uniqueid",
					"value" : [ {
						"xsi:type" : "xs:string",
						"$" : uniqueid
					} ]
				};
				processWorkitem.entity.item.push(valueObj);
				console.debug("data:", processWorkitem);
			});

		},
		error : function(jqXHR, error, errorThrown) {

			message = errorThrown;
			$("#error-message").text(message);
			$("#imixs-error").show();
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
			json = xml2json(response);

//			workitemController.model.entity = json.entity;
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
var RestServiceRoute = benJS.createRoute('restservice-route', {
	"content" : "view_restservice.html"
});

RestServiceRoute.beforeRoute.add(function(router) {
	restServiceController.pull();
});

RestServiceRoute.afterRoute.add(function(router) {
	$("#imixs-nav ul li").removeClass('active');
	$("#imixs-nav ul li:nth-child(1)").addClass('active');
});

var QueryRoute = benJS.createRoute('query-route', {
	"content" : "view_query.html"
});

QueryRoute.afterRoute.add(function(router) {
	$("#imixs-nav ul li").removeClass('active');
	$("#imixs-nav ul li:nth-child(2)").addClass('active');
});

var WorkitemRoute = benJS.createRoute('workitem-route', {
	"content" : "view_workitem.html"
});

WorkitemRoute.beforeRoute.add(function(router) {

});

WorkitemRoute.afterRoute.add(function(router) {
	$("#imixs-nav ul li").removeClass('active');
	$("#imixs-nav ul li:nth-child(2)").addClass('active');
});

var bulkUpdateRoute = benJS.createRoute('bulkupdate-route', {
	"content" : "view_bulkupdate.html"
});

bulkUpdateRoute.beforeRoute.add(function(router) {

});

bulkUpdateRoute.afterRoute.add(function(router) {
	$("#imixs-nav ul li").removeClass('active');
	$("#imixs-nav ul li:nth-child(3)").addClass('active');
});

var contentTemplate = benJS.createTemplate("content");
contentTemplate.afterLoad.add(layoutSection);

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