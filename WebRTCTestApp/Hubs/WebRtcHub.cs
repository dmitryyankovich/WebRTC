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
        static Dictionary<String, Room> Rooms = new Dictionary<string, Room>();

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

        public void Send(string message, string groupName)
        {
            Clients.OthersInGroup(groupName).newMessage(message);
        }

        public override Task OnDisconnected(bool stopCalled)
        {
            foreach (var room in Rooms)
            {
                if (room.Value.Users.Contains(Context.ConnectionId))
                {
                    Groups.Remove(Context.ConnectionId, room.Key);
                    room.Value.Users.Remove(Context.ConnectionId);
                    Clients.OthersInGroup(room.Key).Disconnected();
                }
            }

            return base.OnDisconnected(stopCalled);
        }

        public void FileNotify(string groupName, string fileName, int fileSize)
        {
            Clients.OthersInGroup(groupName).receiveOffer(fileName,fileSize);
        }

        public void CancelNotify(string groupName)
        {
            Clients.OthersInGroup(groupName).cancelNotification();
        }

        public void AcceptNotify(string groupName)
        {
            Clients.OthersInGroup(groupName).acceptNotification();
        }

        public void CompleteNotify(string groupName)
        {
            Clients.OthersInGroup(groupName).completeNotification();
        }
    }
}