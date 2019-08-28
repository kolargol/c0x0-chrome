async function checkJWT(e) {
  e.preventDefault();
  let response = await fetch('https://api.c0x0.com/xpi/hc', {
    method: "GET",
    headers: {
      Authorization: "Bearer " + document.querySelector("#jwt").value
    }
  });
  let statusmsg = await response;
  let statusres = await response.text();
  let tokenValid = "";
  if (statusmsg.status == "200") {
      let isOK = JSON.parse(statusres);
      tokenValid = isOK.result;
    } else {
      tokenValid = "false";
  }
  if (tokenValid == "true") {
    document.getElementById("status").innerHTML = "<span class=\"text-success\">Access Token is Correct</span><br><strong>Settings Saved</strong>";
    saveOptions(document.querySelector("#jwt").value);
  } else {
    document.getElementById("status").innerHTML = "<span class=\"text-danger\">Invalid Access Token!</span>";
    console.log("Trying to save invalid JWT Token");
  }
}

function saveOptions(jwtoken) {
  chrome.storage.sync.set({
      jwt: jwtoken
    }, function () { console.log("Saving..."); });
}

function restoreOptions() {

  function setCurrentChoice(result) {
    document.querySelector("#jwt").value = result || "";
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  /* let cb = getting => console.log("Restoring options"); */
  chrome.storage.sync.get("jwt", function (result) { setCurrentChoice(result.jwt) });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", checkJWT);
