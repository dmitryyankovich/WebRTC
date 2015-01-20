using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNet.SignalR;
using WebRTCTestApp.Models;

namespace WebRTCTestApp.Hubs
{
    public class WebRtcHub : Hub
    {
        static Dictionary<String,Room> Rooms = new Dictionary<string, Room>();

        public string ReturnUserId()
        {
            return Context.ConnectionId;
        }

        public string AddToRoom(string userId, string name)
        {
            if (Rooms.ContainsKey(name))
            {               
                if (Rooms[name].Users.Count == 2 && !Rooms[name].Users.Contains(userId))
                {
                    return "Full";
                }
                    Rooms[name].Users.Add(userId);
                    Groups.Add(Context.ConnectionId, name);
                    return "Connected";
            }
            Rooms.Add(name, new Room { Users = new List<string> { userId } });
            Groups.Add(Context.ConnectionId, name);
            return "Created";
        }

        public bool CheckRoommates(string name)
        {
            return Rooms[name].Users.Count == 2;
        }

        public void Send(string message,string groupName)
        {
            Clients.OthersInGroup(groupName).newMessage(message);
        }

        //Uncomment if SignalR chat
        //public void SendMessage(string message, string groupName)
        //{
        //    Clients.OthersInGroup(groupName).chatMessage(message);
        //}
        
        public override Task OnDisconnected(bool stopCalled)
        {
            foreach (var room in Rooms)
            {
                if (room.Value.Users.Contains(Context.ConnectionId))
                {
                    room.Value.Users.Remove(Context.ConnectionId); 
                    Clients.OthersInGroup(room.Key).Disconnected();
                }
            }
           
            return base.OnDisconnected(stopCalled);
        }
    }
}