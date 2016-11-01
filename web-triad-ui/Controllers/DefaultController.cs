using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace web_triad_ui.Controllers
{
    public class DefaultController : Controller
    {

        public RedirectToRouteResult Index()
        {
            ViewBag.Title = "ReviewControl";
            return RedirectToAction("ReviewControl");
        }

        public ActionResult ReviewControl()
        {
            return View();
        }

        public ActionResult UploadControl()
        {
            return View();
        }
    }
}