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
        public ActionResult ShowRoom(Guid? roomId)
        {
            var model = new ShowRoomModel {RoomId = roomId == null ? Guid.NewGuid() : roomId.Value, UserId = Guid.NewGuid()};
            return View("Room",model);
        }
    }
}