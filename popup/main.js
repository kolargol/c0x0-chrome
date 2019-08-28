/* Parse active tab URL and return domain name */
function url_to_domain(tabUrl) {
  return new URL(tabUrl).hostname
}

/* We need to sent Base64URL string to backend API */
function Base64EncodeUrl(str){
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
}

/* Create unicode compilant base64 */
function b64EncodeUnicode(str) {
  return Base64EncodeUrl(btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    function toSolidBytes(match, p1) {
      return Base64EncodeUrl(String.fromCharCode('0x' + p1));
    }
  )));
}

/* Escape strings so it is safe to display them */
function safeEscape(str){
  if (str == null)
    return "";
  return str.toString().
    replace(/&/g,"&amp;").
    replace(/</g,"&lt;").
    replace(/>/g,"&gt;").
    replace(/\'/g,"&apos;").
    replace(/\"/g,"&quot;");
}

/* Handle Fatal Errors */
function FatalError() {
  Error.apply(this, arguments);
  this.name = "FatalError";
}
FatalError.prototype = Object.create(Error.prototype);

/* Draw Status Line */
function drawStatusLine(col) {
    var c = document.getElementById("statusline");
    var ctx = c.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(300, 1);
    ctx.strokeStyle = col;
    ctx.stroke();
}

/* OpenSettings */
function openSettings(){
  var opening = chrome.runtime.openOptionsPage();
  opening.then();
}

/* API calls processing */

/* Create Alias Call */
async function createAlias(jwtoken, domainScope, aliasName) {
  /* If aliasName is not empty, construct proper URL */
  let aliasEncoded = "";
  if (aliasName) {
    aliasEncoded = b64EncodeUnicode(aliasName);
    aliasEncoded = "/" + aliasEncoded;
  }

  /* Create alias API call */
  let response = await fetch('https://api.c0x0.com/xpi/create-alias-xpi/' + domainScope + aliasEncoded, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + jwtoken
    }
  });

  /* If response fails, notify user */
  if (response.status != "200") {
    let st = await response.text();
    document.getElementById("warningmsg").textContent = "Error: " + st;
  }

  let newalias = await response.json();

  if (!aliasName) {
    aliasName = "Unnamed";
    console.log("User did not provided description for new alias");
  }
  document.getElementById("maincontent").innerHTML = "<h5 class=\"text-success\">New Alias Have Been Created</h5>";

  /* Copy Input */
  var parentElement = document.getElementById('maincontent');
  var childElementBody = document.createElement('div');
  childElementBody.setAttribute('class', 'card bg-light mt-3');
  childElementBody.innerHTML = "<div class=\"card-body p-2 m-1\"><strong>" + safeEscape(aliasName) + "</strong><br>" +
    "<div class=\"input-group\"><input id=\"btnclick\" type=\"text\" class=\"form-control bg-light text-center text-monospace\" readonly value=\"" + safeEscape(newalias.result) +"\">" +
    "<div class=\"input-group-append\"><button class=\"btn btn-primary\" type=\"button\" data-clipboard-target=\"#btnclick\">Copy</button></div></div></div>";
  parentElement.appendChild(childElementBody);

  /* Clipboard copy code */
  var clipboard = new ClipboardJS('.btn');
  clipboard.on('success', function(e) {
      console.log(e);
  });
  clipboard.on('error', function(e) {
      console.log(e);
  });
}

/* Function that create alias */
async function createForm(jwtoken,scopedomain){

  /* Clear previous content */
  document.getElementById("maincontent").innerHTML = "<h5>Create New Alias</h5><small>You are creating new alias." +
    "This alias will be associated with <strong>" + safeEscape(scopedomain) + "</strong> domain. " +
    "You can edit alias properties anytime at <a href=\"https://web.c0x0.com/shield/\">web.c0x0.com/shield/</a> website.</small>";

  /* Prepare form */
  var parentElement = document.getElementById('maincontent');

  /* Prepend and input */
  var childElementForm = document.createElement('div');
  childElementForm.setAttribute('class', 'input-group mt-3 mb-3');
  childElementForm.innerHTML = "<div class=\"input-group-prepend\">" +
    "<span class=\"input-group-text\">Name</span></div>" +
    "<input id=\"newalias\" \"type=\"text\" class=\"form-control bg-light text-center\" placeholder=\"description\"></div>";
  parentElement.appendChild(childElementForm);

  /* Append placeholder */
  var childElementAppend = document.createElement('div');
  childElementAppend.setAttribute('class', 'input-group-append');
  childElementForm.appendChild(childElementAppend);

  /* Append button to input form */
  var childElementSumbit = document.createElement('button');
  childElementSumbit.setAttribute('class', 'btn btn-primary');
  childElementSumbit.textContent = "Create";
  childElementSumbit.onclick = function() { createAlias(jwtoken,scopedomain, document.getElementById("newalias").value); };
  childElementAppend.appendChild(childElementSumbit);

  /* Add note below submit button */
  var note = document.createElement('div');
  note.setAttribute('class','small');
  note.textContent = "Note: Aliases are created for default endpoint";
  parentElement.appendChild(note);

  /* Error placeholder */
  var errplace = document.createElement('div');
  errplace.setAttribute('class','text-danger mt-3');
  errplace.setAttribute('id', 'warningmsg');
  parentElement.appendChild(errplace);
}

/* Display Dialog that no aliases was found and give opportunity to create one */
function noAliasesDialog(jwtoken, scopedomain){
  var parentElement = document.getElementById('maincontent');
  var childElement = document.createElement('div');
  childElement.setAttribute('class', 'mt-3 mb-3');
  childElement.innerHTML = "No aliases found for this domain.<br>" +
    "<small>Aliases were not found but if alias for this domain already exist prior browser extension use - " +
    "you may attach it to this domain manually by visiting <a href=\"https://web.c0x0.com/shield/\">web.c0x0.com/shield/</a> website</small>";
  parentElement.appendChild(childElement);

  /* Append button to the message */
  var addAlias = document.createElement('button');
  addAlias.setAttribute('class','btn btn-success');
  addAlias.textContent = "Create alias for this domain";
  addAlias.onclick = function() { createForm(jwtoken, scopedomain); };
  parentElement.appendChild(addAlias);
}

/* List aliases in given scope */
async function listAliasesScope(jwtoken, scopedomain) {
  console.log("Checking if aliases are present for " + scopedomain + " domain");

  /* List all aliases bound to that domain */
  let response = await fetch('https://api.c0x0.com/xpi/list-aliases/' + scopedomain, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + jwtoken
    }
  });

  /* Catch error response from server */
  if (response.status != "200") {
    let st = await response.text();
    document.getElementById("maincontent").innerHTML = "<strong class=\"text-danger\">Error: </strong>" + safeEscape(st) +
    "<br><small>Please check if you have enabled <strong>API Access</strong> in <a href=\"https://web.c0x0.com/shield/profile.php#profile\">web.c0x0.com</a> account settings.";
  }

  let aliases = await response.json();

  /* If result is empty, display create alias dialog */
  if (aliases.result == "empty") {
      console.log("User do not have any aliases bound to that scope. Let him issue one...");
      noAliasesDialog(jwtoken, scopedomain);
    } else {

      /* Print all aliases we found */
      var parentElement = document.getElementById('maincontent');
      for (let alias of aliases) {
        /* Create Card */
        /* Card */
        var childElement = document.createElement('div');
        childElement.setAttribute('class', 'card bg-light p-1 mb-4 mt-2');
        parentElement.appendChild(childElement);

        /* Card Body */
        var childElementBody = document.createElement('div');
        childElementBody.setAttribute('class', 'card-body p-1');
        childElementBody.innerHTML = "<strong>" + safeEscape(alias.tag) + "</strong><br>" +
          "<div class=\"input-group\"><input id=\"btn" + safeEscape(alias.alias_id) + "\"type=\"text\" class=\"form-control bg-light text-center text-monospace\" readonly value=\"" + safeEscape(alias.alias) +"\">" +
          "<div class=\"input-group-append\"><button class=\"btn btn-primary\" type=\"button\" data-clipboard-target=\"#btn" + safeEscape(alias.alias_id) + "\">Copy</button></div></div>";
        childElement.appendChild(childElementBody);
      }

      /* Clipboard copy code */
      var clipboard = new ClipboardJS('.btn');
      clipboard.on('success', function(e) {
          console.log(e);
      });
      clipboard.on('error', function(e) {
          console.log(e);
      });

      var addAnotherOne = document.createElement('button');
      addAnotherOne.setAttribute('class','btn btn-success');
      addAnotherOne.textContent = "Create Another One?";
      addAnotherOne.onclick = function() { createForm(jwtoken, scopedomain); };
      parentElement.appendChild(addAnotherOne);
    }
}

/* We Start Here */
async function here(jwtoken) {
  /* Get token from storage
  let jwtoken = await chrome.storage.sync.get("jwt");

  /* Check if API works and JWT token is correct */
  let response = await fetch('https://api.c0x0.com/xpi/hc', {
    method: "GET",
    headers: {
      Authorization: "Bearer " + jwtoken
    }
  });
  let statusmsg = await response;

  /* If test passed proceed otherwise print error and stop */
  if (statusmsg.status == "200") {
    /* Draw Status Line */
    drawStatusLine("green");

    console.log("API connectivity and JWT seems OK");

    /* Get current domain in active tab */
    let tabs = await chrome.tabs.query({currentWindow: true, active: true}, 
      function(result) { 
        console.log(result[0].url);
        var scopedomain = url_to_domain((result[0].url));
        document.getElementById("scopedomain").innerHTML = safeEscape(scopedomain);
        listAliasesScope(jwtoken,scopedomain);
    });

  } else {
    /* Draw Status Line */
    drawStatusLine("red");

    /* Display Error Message */
    document.getElementById("maincontent").innerHTML = "<strong>Unable to contact API server</strong>" +
    "<br><small>Please check your <strong>Access Token</strong> or Network Connectivity</small>" +
    "<br><br><button id=\"optionsbutton\" class=\"btn btn-primary\">Go To Settings</button>";
    let a = document.getElementById("maincontent");
    a.onclick = function() { openSettings(); };

    console.log("Unable connect to API");
  }
}

function checkToke(token) {
  if (!token) {
    console.log("User did not configured Access Token");
    /* Welcome new user */
    document.getElementById("maincontent").innerHTML = "<h5>Thank You!</h5>" +
    "<small>Looks like you just installed <a href=\"https://c0x0.com\">c0x0.com</a> browser extension!<br>To configure extension you need to have active c0x0.com account.</strong></small>" +
    "<br><br><button id=\"createaccount\" class=\"btn btn-primary\">Create Account</button> or <button id=\"optionsbutton\" class=\"btn btn-primary\">Go To Settings</button>";
    let a = document.getElementById("optionsbutton");
    a.onclick = function() { openSettings(); };
    let b = document.getElementById("createaccount");
    b.onclick = function () { window.open("https://web.c0x0.com/register/"); };
    } else {
      here(token);
  }
}


/* Init here */
chrome.storage.sync.get("jwt", function(result) { checkToke(result.jwt); } );
