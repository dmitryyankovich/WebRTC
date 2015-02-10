using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using WebRTCTestApp.Models;

namespace WebRTCTestApp.Controllers
{
    public class WebRTCController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult ShowRoom(Guid? roomId)
        {
            var model = new ShowRoomModel { RoomId = roomId == null ? Guid.NewGuid() : roomId.Value };
            return View("Room", model);
        }
    }
}