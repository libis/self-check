// var baseURL = "https://services.libis.be";
var baseURL = window.location.origin;
console.log("baseURL", baseURL);

var libraryName = "RBIB";

var institution = "kuleuven";

// check if the pathname includes 'vlerick'
if (window.location.pathname.toLowerCase().includes("vlerick")) {
  libraryName = "VBS";
  institution = "vlerick";
}
console.log("libraryName", libraryName);
var circDesk = "DEFAULT_CIRC_DESK";

function initiate() {
  getModalBox();
  /////////////////////////////////////////////////////////////////////////////////////////////
  // Add institution as a class to .toptoolbar
  var topToolbar = document.querySelector(".toptoolbar");
  if (topToolbar) {
    topToolbar.className = "toptoolbar " + institution;
    // or topToolbar.classList.add(institution);
  }

  // change logo dynamically too
  var logoImg = document.querySelector(".logo img");
  if (logoImg && institution === "vlerick") {
    logoImg.src = "images/vlericklogo.png";
  } else {
    logoImg.src = "images/libisnewkuljr.png"; // default logo
  }

  // change from blue to black background color

  var h1Title = document.querySelector(".maincontent .h1title");
  if (h1Title && institution === "vlerick") {
    h1Title.classList.add("vlerickclass");
  }

  var h1Title = document.getElementById("scanboxtitle");
  if (h1Title && institution === "vlerick") {
    h1Title.classList.add("vlerickclass");
  }
  /////////////////////////////////////////////////////////////////////////////////////////////

  $("#barcode").bind("keypress", function (e) {
    var code = e.keyCode || e.which;
    if (code == 13) {
      loan();
    }
  });

  $("#userid").bind("keypress", function (e) {
    var code = e.keyCode || e.which;
    if (code == 13) {
      login();
    }
  });
}

var modal;
var span;
var user = null; // User data to track login state

function getModalBox() {
  // Get the modal
  modal = document.getElementById("myModal");
  $("#myModal").hide();

  // Get the <span> element that closes the modal
  span = document.getElementsByClassName("close")[0];

  // When the user clicks on <span> (x), close the modal
  span.onclick = function () {
    $("#myModal").hide();
  };
}

function returnToBarcode() {
  $("#barcode").prop("disabled", false);
  $("#myModal").hide();

  $("#barcode").val("");
  $("#barcode").focus();
}

var inactivityTime = function () {
  var time;
  var logoutTime = 30000; // 30 seconds

  function resetTimer() {
    if (user) {
      // Only reset the timer if the user is logged in
      clearTimeout(time);
      time = setTimeout(logoutUser, logoutTime);
    }
  }

  // Events to reset the timer
  window.onload = resetTimer;
  document.onmousemove = resetTimer;
  document.onkeypress = resetTimer;
  document.ontouchstart = resetTimer;

  // Logout function
  function logoutUser() {
    if (user) {
      // Only log out if the user is logged in
      logout();
      returnToBarcode();
      user = null;
    }
  }
};

// Initialize the inactivity timer
inactivityTime();

var renewButtonText = "RENEW";
/* LOGIN */
function login() {
  var loginid = $("#userid").val();
  if (loginid != null && loginid != "") {
    $("#userid").prop("disabled", true);
    $("#loginerror").addClass("hide");

    $("#modalheader").text("loading data, please wait...");
    $("#myModal").show();
    $(".close").hide();

    $.ajax({
      type: "GET",
      url:
        baseURL +
        "/" +
        institution +
        "/almaws/v1/users/" +
        $("#userid").val() +
        "?expand=loans,requests,fees&format=json&limit=100", // added limit to 100 (default == 10)
      contentType: "text/plain",
      dataType: "json",
      crossDomain: true,
    })
      .done(function (data) {
        user = data;
        // Prepare scan box
        $("#scanboxtitle").text(
          "Welcome " + data.first_name + " " + data.last_name
        );
        $("#userloans").text(data.loans.value);
        $("#userrequests").text(data.requests.value);
        $("#userfees").text("€ " + data.fees.value);

        // Add Vlerick styling after loggin
        var h1Title = document.querySelector(".maincontent .h1title");
        if (h1Title && institution === "vlerick") {
          h1Title.classList.add("vlerickclass");
        }
        var h1Title = document.getElementById("scanboxtitle");
        if (h1Title && institution === "vlerick") {
          h1Title.classList.add("vlerickclass");
        }
        $("#loanstable").find("tr:gt(0)").remove();

        // Fetch loan details

        let loanUrl = data.loans.link;
        loanUrl += (loanUrl.includes("?") ? "&" : "?") + "limit=100";

        $.ajax({
          type: "GET",
          url: loanUrl,
          contentType: "text/plain",
          dataType: "json",
          crossDomain: true,
        })
          .done(function (loanData) {
            // Iterate through loans and append to table
            loanData.item_loan.forEach(function (loan) {
              var dueDate = new Date(loan.due_date);
              var dueDateText =
                dueDate.getDate() +
                "/" +
                (dueDate.getMonth() + 1) +
                "/" +
                dueDate.getFullYear();
              $("#loanstable").append(
                "<tr id='loan-" +
                  loan.loan_id +
                  "'><td>" +
                  loan.title +
                  "</td><td>" +
                  dueDateText +
                  "</td><td><button onclick='renewLoan(\"" +
                  loan.loan_id +
                  "\")'>" +
                  renewButtonText +
                  "</button></td></tr>"
              );
              returnToBarcode();
            });
          })
          .fail(function (jqxhr, textStatus, error) {
            console.log(jqxhr.responseText);
          });

        $("#loginbox").addClass("hide");
        $("#scanbox").toggleClass("hide");

        $("#barcode").focus();
      })
      .fail(function (jqxhr, textStatus, error) {
        $("#loginerror").toggleClass("hide");
        console.log(jqxhr.responseText);
      })
      .always(function () {
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
  if (barcode != null && barcode != "") {
    $("#modalheader").text("processing request, please wait...");
    $("#myModal").show();
    $(".close").hide();

    $("#barcode").prop("disabled", true);

    $.ajax({
      type: "POST",
      url:
        baseURL +
        "/" +
        institution +
        "/almaws/v1/users/" +
        user.primary_id +
        "/loans?user_id_type=all_unique&item_barcode=" +
        $("#barcode").val(),
      contentType: "application/xml",
      data:
        "<?xml version='1.0' encoding='UTF-8'?><item_loan><circ_desk>" +
        circDesk +
        "</circ_desk><library>" +
        libraryName +
        "</library></item_loan>",
      dataType: "xml",
    })
      .done(function (data) {
        // Extract loanId from the POST response
        var loanId = $(data).find("loan_id").text();
        if (!loanId) {
          console.error("Loan ID is undefined");
          alert("Failed to retrieve loan ID");
          $("#myModal").hide();
          returnToBarcode();
          return;
        }
        // var dueDate = new Date($(data).find("due_date").text());
        // var dueDateText = (parseInt(dueDate.getDate() + "/" + dueDate.getMonth()) + 1)  + "/" + dueDate.getFullYear();
        // $("#loanstable").append("<tr id='loan-" + loan.loan_id + "'><td>" + $(data).find("title").text() + "</td><td>" + dueDateText + "</td></tr>");
        // returnToBarcode();
        fetchUserDetailsAndLoans();
      })
      .fail(function (jqxhr, textStatus, error) {
        console.log(jqxhr.responseText);
        $("#modalheader").text("");
        $("#modalheader").append(
          "Something went wrong.<br/><br/>Please consult the library information desk for more information<br/><br/><input class='modalclose' type='button' value='close' id='barcodeerrorbutton' onclick='javascript:returnToBarcode();'/>"
        );
        $("#barcodeerrorbutton").focus();

        $(".close").show();

        $("#barcode").val("");
      })
      .always(function () {});
  }
}

function fetchUserDetailsAndLoans() {
  $.ajax({
    type: "GET",
    url:
      baseURL +
      "/" +
      institution +
      "/almaws/v1/users/" +
      $("#userid").val() +
      "?expand=loans,requests,fees&format=json&limit=100",
    contentType: "text/plain",
    dataType: "json",
    crossDomain: true,
  })
    .done(function (data) {
      user = data;
      $("#scanboxtitle").text(
        "Welcome " + data.first_name + " " + data.last_name
      );
      $("#userloans").text(data.loans.value);
      $("#userrequests").text(data.requests.value);
      $("#userfees").text("€ " + data.fees.value);
      // Add Vlerick styling after
      var h1Title = document.querySelector(".maincontent .h1title");
      if (h1Title && institution === "vlerick") {
        h1Title.classList.add("vlerickclass");
      }

      "#loanstable".find("tr:gt(0)").remove();

      $.ajax({
        type: "GET",
        url: data.loans.link,
        contentType: "text/plain",
        dataType: "json",
        crossDomain: true,
      })
        .done(function (loanData) {
          loanData.item_loan.forEach(function (loan) {
            var dueDate = new Date(loan.due_date);
            var dueDateText = `${dueDate.getDate()}/${
              dueDate.getMonth() + 1
            }/${dueDate.getFullYear()}`;
            $("#loanstable").append(
              "<tr id='loan-" +
                loan.loan_id +
                "'><td>" +
                loan.title +
                "</td><td>" +
                dueDateText +
                "</td><td><button onclick='renewLoan(\"" +
                loan.loan_id +
                "\")'>" +
                renewButtonText +
                "</button></td></tr>"
            );
            returnToBarcode();
          });
        })
        .fail(function (jqxhr, textStatus, error) {
          console.log(jqxhr.responseText);
        });

      $("#barcode").focus();
    })
    .fail(function (jqxhr, textStatus, error) {
      console.log(jqxhr.responseText);
    });
}
function renewLoan(loanId) {
  const userId = user.primary_id;
  $("#modalheader").text("processing renewal, please wait...");
  $("#myModal").show();
  $(".close").hide();
  $.ajax({
    type: "POST",
    url:
      baseURL +
      "/" +
      institution +
      "/almaws/v1/users/" +
      userId +
      "/loans/" +
      loanId +
      "?op=renew",
    contentType: "application/xml",
    data:
      "<?xml version='1.0' encoding='UTF-8'?><renew_loan><circ_desk>" +
      circDesk +
      "</circ_desk><library>" +
      libraryName +
      "</library></renew_loan>",
    dataType: "xml",
  })
    .done(function (data) {
      // Make a new GET request to fetch the updated loan data to fix bug of not seeing immediatly
      $.ajax({
        type: "GET",
        url:
          baseURL +
          "/" +
          institution +
          "/almaws/v1/users/" +
          userId +
          "/loans/" +
          loanId,
        contentType: "application/json",
        dataType: "json",
      })
        .done(function (updatedLoanData) {
          var updatedDueDate = new Date(updatedLoanData.due_date);
          var updatedDueDateText = `${updatedDueDate.getDate()}/${
            updatedDueDate.getMonth() + 1
          }/${updatedDueDate.getFullYear()}`;
          // Update the due date in the table
          var dueDateCell = $("#loan-" + loanId + " td:nth-child(2)");
          dueDateCell.text(updatedDueDateText);

          // if 401193 value for last renew status -> means that renewd succes, else not succes renewed for whatever reason
          var succesfullyRenewedValueCode = "401193;";
          var LastRenewedValueCode = updatedLoanData?.last_renew_status?.value;

          var renewCell = $("#loan-" + loanId + " td:nth-child(3)");
          if (LastRenewedValueCode == succesfullyRenewedValueCode) {
            renewCell.text("RENEWED");
            renewCell.removeClass("not-renewable").addClass("renewed");
          } else {
            renewCell.text("NOT RENEWABLE");
            renewCell.removeClass("renewed").addClass("not-renewable");
          }
          $("#myModal").hide();
        })
        .fail(function (error) {
          console.error("Error fetching updated loan data:", error);
          alert("Failed to fetch updated loan data");
          $("#myModal").hide();
        });
    })
    .fail(function (error) {
      console.error("Error:", error);
      alert("Failed to renew loan");
      $("#myModal").hide();
    });
}

function logout() {
  user = null;
  $("#userid").val("");
  $("#loginbox").toggleClass("hide");
  $("#scanbox").toggleClass("hide");
  $("#userid").focus();
}

$(document).ready(function () {
  $("#userid").focus();
});
