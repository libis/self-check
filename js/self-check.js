
var baseURL = "https://services.t.libis.be";
var libraryName = "RBIB";
var circDesk = "DEFAULT_CIRC_DESK";

function initiate() {
	getModalBox();
	
	$("#barcode").bind("keypress", function(e) {
		var code = e.keyCode || e.which;
		if(code == 13) {
			loan();
		 }
	});
	

	$("#userid").bind("keypress", function(e) {
		var code = e.keyCode || e.which;
		if(code == 13) {
			login();
		 }
	});
}

var modal;
var span;
var user;

function getModalBox() {
	
	// Get the modal
	modal = document.getElementById('myModal');
	$("#myModal").hide();
	
	// Get the <span> element that closes the modal
	span = document.getElementsByClassName("close")[0];

	// When the user clicks on <span> (x), close the modal
	span.onclick = function() {
		$("#myModal").hide();
	}

	// When the user clicks anywhere outside of the modal, close it
	/*
	window.onclick = function(event) {
	    if (event.target == modal) {
	    	$("#myModal").hide();
	    }
	}
	*/
}

function returnToBarcode() {
	$("#barcode").prop("disabled", false);
	$("#myModal").hide();
	
	$("#barcode").val("");
	$("#barcode").focus();
}


/* LOGIN */

function login() {
    var loginid = $("#userid").val();
    if ((loginid != null) && (loginid != "")) {
        
        $("#userid").prop("disabled", true);
        $("#loginerror").addClass("hide");
        
        $("#modalheader").text("loading data, please wait...");
        $("#myModal").show();
        $(".close").hide();
        
        $.ajax({
            type: "GET",
            url: baseURL + "/almaws/v1/users/" + $("#userid").val() + "?apikey=" + API_KEY + "&expand=loans,requests,fees&format=json",
            contentType: "text/plain",
            dataType: "json",
            crossDomain: true
            
        }).done(function(data) {
            user = data;
            console.log("data:", data);

            // Prepare scan box
            $("#scanboxtitle").text("Welcome " + data.first_name + " " + data.last_name);
            $("#userloans").text(data.loans.value);
            $("#userrequests").text(data.requests.value);
            $("#userfees").text("€ " + data.fees.value);
            
            $("#loanstable").find("tr:gt(0)").remove();
            
            // Fetch loan details
            $.ajax({
                type: "GET",
                url: data.loans.link + "?apikey=" + API_KEY,
                contentType: "text/plain",
                dataType: "json",
                crossDomain: true
            }).done(function(loanData) {
                // Iterate through loans and append to table
                loanData.item_loan.forEach(function(loan) {
                    var dueDate = new Date(loan.due_date);
                    var dueDateText = (dueDate.getMonth() + 1) + "/" + dueDate.getDate() + "/" + dueDate.getFullYear();
                    $("#loanstable").append("<tr><td>" + loan.title + "</td><td>" + dueDateText + "</td><td><button onclick='renewLoan(\"" + loan.loan_id + "\")'>RENEW</button></td></tr>");
                });
            }).fail(function(jqxhr, textStatus, error) {
                console.log(jqxhr.responseText);
            });

            $("#loginbox").addClass("hide");
            $("#scanbox").toggleClass("hide");
            
            $("#barcode").focus();
            
        }).fail(function(jqxhr, textStatus, error) {
            $("#loginerror").toggleClass("hide");
            console.log(jqxhr.responseText);
            
        }).always(function() {
            $("#userid").prop("disabled", false);
            $("#myModal").hide();
        });
    }
}

function loaduser(data) {
	alert(data);
}

function loan() {
	
	var barcode = $("#barcode").val();
    if ((barcode != null) && (barcode != "")) {
    	
    	$("#modalheader").text("processing request, please wait...");
        $("#myModal").show();
        $(".close").hide();

		$("#barcode").prop("disabled", true);

    	$.ajax({
    		type: "POST",
    		// url: baseURL + "/almaws/v1/users/" + user.primary_id + "/loans?user_id_type=all_unique&item_barcode=" + $("#barcode").val(),
    		url: baseURL + "almaws/v1/users/" + user.primary_id + "/loans?user_id_type=all_unique&item_barcode=" + $("#barcode").val() + "&apikey=" + API_KEY,
    		contentType: "application/xml",
    		data: "<?xml version='1.0' encoding='UTF-8'?><item_loan><circ_desk>" + circDesk + "</circ_desk><library>" + libraryName + "</library></item_loan>",
    		dataType: "xml"
    	}).done(function(data){
    		
    		var dueDate = new Date($(data).find("due_date").text());
    		var dueDateText = (parseInt(dueDate.getMonth()) + 1) + "/" + dueDate.getDate() + "/" + dueDate.getFullYear();
    		$("#loanstable").append("<tr><td>" + $(data).find("title").text() + "</td><td>" + dueDateText + "</td></tr>");
    		
    		returnToBarcode();
    		
    	}).fail(function(jqxhr, textStatus, error) {
    		console.log(jqxhr.responseText);
    		
    		$("#modalheader").text("");
    		$("#modalheader").append("item not avaiable for loan.<br/><br/>please see the reference desk for more information<br/><br/><input class='modalclose' type='button' value='close' id='barcodeerrorbutton' onclick='javascript:returnToBarcode();'/>");
    		$("#barcodeerrorbutton").focus();
    		
    		$(".close").show();

    		$("#barcode").val("");

    	}).always(function() {
    		
    	});
    	
    }
} 
function renewLoan(loanId) {
    console.log( "'loanId'" ,loanId)
    const userId = user.primary_id;

    $("#modalheader").text("processing renewal, please wait...");
    $("#myModal").show();
    $(".close").hide();

    $.ajax({
        type: "POST",
        url: baseURL + "/almaws/v1/users/" + userId + "/loans/" + loanId + "?apikey=" + API_KEY,
        contentType: "application/xml",
        data: "<?xml version='1.0' encoding='UTF-8'?><renew_loan><circ_desk>" + circDesk + "</circ_desk><library>" + libraryName + "</library></renew_loan>",
        dataType: "xml"
    }).done(function(data) {
        var dueDate = new Date($(data).find("due_date").text());
        var dueDateText = (parseInt(dueDate.getMonth()) + 1) + "/" + dueDate.getDate() + "/" + dueDate.getFullYear();
        alert('Loan renewed successfully! New due date: ' + dueDateText);
        $("#myModal").hide();
    }).fail(function(error) {
        console.error('Error:', error);
        alert('Failed to renew loan');
        $("#myModal").hide();
    });
}

function logout() {
	$("#userid").val("");
	$("#loginbox").toggleClass("hide");
	$("#scanbox").toggleClass("hide");
	$("#userid").focus();
}

$( document ).ready(function() {
	  $( "#userid" ).focus();
	});