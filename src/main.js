import $ from "jquery";
import moment from "moment";
import Swal from "sweetalert2";
import "jquery-modal";
import "moment/locale/cs";

let API_URL;
if (import.meta.env.PROD) {
  API_URL = "/api/get.php";
} else {
  API_URL = "https://wizerme.jardah.eu/api/get.php";
}

//update ui
function updatehistory() {
  var lastids = localStorage.getItem("last-ids");
  if (lastids !== null && $(".history").length) {
    let json = JSON.parse(lastids);
    json.reverse();
    var out = "";
    json.forEach((json) => {
      moment.locale("cs");
      var timestamp = moment.unix(json.time);
      out += `<div class="item">
          <div class="main-info">
            <h2>${json.name} <span time="${json.time
        }">${timestamp.fromNow()}</span></h2>
            <div class="run-again btn"><i class="fa-solid fa-eye"></i></div>
            <div class="show-more btn"><i class="fa-solid fa-angle-down"></i></div>
          </div>
          <div class="more-info">
            <p class="id">${json.id}</p>
            <p class="img"><img src="${json.img}"></p>
          </div>
          </div>`;
    });
    if (out !== "") {
      if (out !== $(".history-get").html()) {
        $(".history-get").html(out);
      }
    } else {
      $(".history-get").html('<p class="nothing">Zatím nic</p>');
    }
  }
}
$(function () {
  function OdeslatForm(val) {
    return new Promise((resolve, reject) => {
      if ($("input[name=i]").val().length < 4 && !val) {
        reject("Moc krátké ID/URL!");
      } else {
        //setup data
        let input = val ? val : $("input[name=i]").val();
        $.ajax({
          url: API_URL,
          type: "POST",
          data: {
            i: input,
          },
          beforeSend: function () {
            if (!val) {
              $(".form #send").html('<i class="fas fa-cog fa-spin"></i>');
            }
          },
          success: function (d) {
            $(".error").hide();
            $(".form #send").html('<i class="fa-solid fa-paper-plane"></i>');
            if (d.status == 0) {
              reject("Zadané ID neexistuje.");
            } else {
              if (localStorage.getItem("last-ids") === null) {
                //create new
                localStorage.setItem("last-ids", JSON.stringify([]));
              }
              if (!val) {
                var lastids = localStorage.getItem("last-ids");
                let keepmax = 5;
                var json = JSON.parse(lastids);
                if (json.length == keepmax) {
                  json = json.slice(1); //remove first
                }
                json.push({
                  name: d.name,
                  time: d.time,
                  id: d.id,
                  img: d.img,
                });
                localStorage.setItem("last-ids", JSON.stringify(json));
                updatehistory();
              }
              $(".hax").fadeOut(200, () => {
                $(".hax").after(
                  `<div class="hax-done" style="display: none">${d.html}</div>`
                );
                $(".hax-done").fadeIn(200);
                //on ready modal
                if ($("[data-modal]").length) {
                  $("[data-modal]").on("click", function () {
                    $($(this).data("modal")).modal();
                    return false;
                  });
                }
                resolve(true);
              });
            }
          },
          error: function (data) {
            $(".error").hide();
            console.log(data);
            reject("Neočekávaná chyba, více info v konzoli.");
          },
        });
      }
    });
  }
  $(document).on("keypress", "input[name=i]", function (e) {
    if (e.which == 10 || e.which == 13) {
      OdeslatForm().catch((e) => {
        Swal.fire({
          icon: "error",
          title: e,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
          },
        });
      });
    }
  });

  $(document).on("click", "#send", function (e) {
    OdeslatForm().catch((e) => {
      Swal.fire({
        icon: "error",
        title: e,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", Swal.stopTimer);
          toast.addEventListener("mouseleave", Swal.resumeTimer);
        },
      });
    });
  });

  $(document).on("click", "#ReloadBack", function (e) {
    //get ready for going back
    $(".error").hide();
    $(".id-input").val("");
    $(".hax-done").fadeOut(200, () => {
      $(".hax").fadeIn(200);
      $(".hax-done").remove();
    });
  });
  //on history eye click
  $(document).on("click", ".history-get .run-again", async function (e) {
    let id = $(this).closest(".item").find(".more-info .id").text();
    $(this).html('<i class="fas fa-sync fa-spin"></i>');
    await OdeslatForm(id)
      .then(() => {
        $(this).html('<i class="fa-solid fa-eye"></i>');
      })
      .catch((e) => {
        $(this).html('<i class="fa-solid fa-eye"></i>');
        Swal.fire({
          icon: "error",
          title: e,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
          },
        });
      });
  });
  //on history arrow click
  $(document).on("click", ".history-get .show-more", function (e) {
    let ico = $(this).find("i");
    if (ico.hasClass("fa-angle-down")) {
      ico.removeClass("fa-angle-down");
      ico.addClass("fa-angle-up");
    } else {
      ico.removeClass("fa-angle-up");
      ico.addClass("fa-angle-down");
    }
    $(this).closest(".item").find(".more-info").toggle("slow");
  });
  //update time
  setInterval(() => {
    $("[time]").each(function (i, time) {
      moment.locale("cs");
      let cas = $(time).attr("time");
      var timestamp = moment.unix(cas);
      $(this).html(timestamp.fromNow());
    });
  }, 1000);
  //dark mode
  function changebtn(to) {
    /* if ($(".dark-mode-toggle").hasClass("changing")) {
      return false;
    } */
    var hide_ico =
      to == "light" ? ".dark-mode-toggle .dark" : ".dark-mode-toggle .white";
    var new_ico =
      to == "light" ? ".dark-mode-toggle .white" : ".dark-mode-toggle .dark";
    $(".dark-mode-toggle").addClass("changing");
    $(hide_ico).fadeOut(200, () => {
      $(new_ico).fadeIn(200, () => {
        $(".dark-mode-toggle").removeClass("changing");
      });
    });
  }
  const btn = document.querySelector(".dark-mode-toggle");
  const LightModeNastaveni = window.matchMedia("(prefers-color-scheme: light)");
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === null) {
    //os settings
    if (LightModeNastaveni.matches) {
      document.body.classList.add("light-mode");
      changebtn("light");
    } else {
      document.body.classList.add("dark-mode");
      changebtn("dark");
    }
  } else {
    //local file
    if (currentTheme == "dark") {
      document.body.classList.add("dark-mode");
      changebtn("dark");
    } else if (currentTheme == "light") {
      document.body.classList.add("light-mode");
      changebtn("light");
    }
  }
  btn.addEventListener("click", () => {
    if (document.body.classList.contains("dark-mode")) {
      changebtn("light");
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
      var theme = "light";
      localStorage.setItem("theme", theme);
    } else {
      changebtn("dark");
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
      var theme = "dark";
      localStorage.setItem("theme", theme);
    }
  });
});
window.addEventListener("load", (e) => {
  setTimeout(function () {
    updatehistory();
    $(".loading").fadeOut(200, () => {
      $(".hax").fadeIn(200);
    });
  }, 1000);
});
