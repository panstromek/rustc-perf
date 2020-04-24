const BASE_URL = window.location.origin + "/perf";

function getSelected(name) {
    let e = document.getElementById(name);
    return e.options[e.selectedIndex].value;
}

// Get lists of the available crates from the server and make
// the lists of checkboxes and other settings.
// Assumes the initial graph is total/total/by crate
function make_settings(callback) {
    let infoURL = 'info.json'; // FIXME use perf-rlo
    return fetch(infoURL, {}).then(function(response) {
        response.json().then(function(data) {
            let phases_html = "";
            for (let stat of data.stats) {
                phases_html += `<option value="${stat}">${stat}</option>`;
            }
            let list = document.getElementById("stats");
            if (list) {
                list.innerHTML = phases_html;
                list.value = 'instructions:u';
            }
            document.getElementById("as-of").innerHTML =
                "Updated as of: " + (new Date(data.as_of)).toLocaleString();
            callback();
        });
    }, function(err) {
        document.getElementById("settings").innerHTML = "Error fetching info";
        console.log("Error fetching info:");
        console.log(err);
    });
}


function query_string_for_state(state) {
    let result = "?";
    for (let k in state) {
        if (result.length > 1) {
            result += "&";
        }
        // Best known way to check if passed state is a date object.
        if (state[k].toISOString) {
            result += k + "=" + encodeURIComponent(state[k].toISOString());
        } else if (typeof state[k] == "string") {
            result += k + "=" + encodeURIComponent(state[k]);
        } else {
            result += k + "=" + encodeURIComponent(JSON.stringify(state[k]));
        }
    }
    return result;
}

function load_state(callback, skip_settings) {
    let params = new URLSearchParams(window.location.search.slice(1));
    let state = {};
    for (let param of params) {
        let key = param[0];
        let value = param[1];
        if (key === "absolute") {
            value = value === "true";
        }
        state[key] = value;
    }
    callback(state);
    if (!skip_settings) {
        make_settings(() => {
            if (state.stat) {
                let e = document.getElementById("stats");
                for (let i = 0; i < e.options.length; i++) {
                    if (e.options[i].text === state.stat) {
                        e.options[i].selected = true;
                        break;
                    }
                }
            }
        });
    }
    if (state.start) {
        document.getElementById("start-bound").value = state.start;
    }
    if (state.end) {
        document.getElementById("end-bound").value = state.end;
    }
    if (state.absolute === true || state.absolute === false) {
        document.getElementById("absolute").checked = state.absolute;
    } else {
        // check absolute by default
        let element = document.getElementById("absolute");
        if (element) {
            element.checked = true;
        }
    }
}

// This one is for making the request we send to the backend.
function make_request(path, body) {
    return fetch(BASE_URL + path, {
        method: "POST",
        body: JSON.stringify(body),
        mode: "cors"
    }).then(response => {
        if (response.ok) {
            if(MessagePack === undefined) {
                alert("msgpack is not loaded");
                return Promise.reject("msgpack is not loaded");
            }
            return MessagePack.decodeAsync(response.clone().body).catch(() => {
                return response.text().then(data => alert(data));
            });
        } else {
            return response.text().then(data => {
                alert(data);
                return Promise.reject(data);
            });
        }
    }, err => {
        console.log("error fetching ", path, ": ", err);
    });
}
