import axios from "axios";
import cheerio from "cheerio";
//@ts-ignore
import Slimbot from "slimbot";
import { v4 as uuidv4 } from "uuid";

require('dotenv').config()

const baseURL = "https://www.residentadvisor.net";

const StupidStorage: any = {};

const isUrl = (maybeUrl: string): boolean => {
  return maybeUrl.indexOf("http") !== -1 || maybeUrl.indexOf("https") !== -1;
};

const getAvailableTickets = async (url: string): Promise<boolean> => {
  const { data } = await axios.get(url);

  const $ = cheerio.load(data);
  const el = $("li[id=tickets]").html();

  for (const line of el!.split("\n")) {
    if (line.indexOf("onsale") !== -1) {
      return true;
    }
  }

  return false;
};

const startBot = () => {
  const slimbot = new Slimbot(process.env.BOT_TOKEN);

  slimbot.on("message", (message: any) => {
    const { text, chat } = message;
    if (text.indexOf("/watch") !== -1) {
      const [, urlOrId] = text.split(" ");
      const url = isUrl(urlOrId) ? urlOrId : baseURL + "/events/" + urlOrId;

      const interval = setInterval(async () => {
        if (await getAvailableTickets(url)) {
          clearInterval(interval);
          slimbot.sendMessage(
            chat.id,
            `Tickets are available! Go to ${url} to purchase.`
          );
        } else {
          console.log(`Tickets for ${url} not yet available.`);
        }
      }, 3000);

      const id = uuidv4();

      StupidStorage[id] = {
        chatId: chat.id,
        interval,
        status: "pending",
      };

      slimbot.sendMessage(
        chat.id,
        `Alright! I'll let you know when tickets are available.`
      );
      slimbot.sendMessage(
        chat.id,
        `Your unique identifier is ${id}. Type "/status <id>" to make sure I'm still running or "/cancel <id>" to clear the request.`
      );
      slimbot.sendMessage(
        chat.id,
        `Requests will be cancelled after a week automatically.`
      );
    } else if (text.indexOf("/cancel") !== -1) {
      const [, id] = text.split(" ");
      const item = StupidStorage[id];
      if (item && item.interval && item.status === "pending") {
        clearInterval(item.interval);
        StupidStorage[String(id)] = {
          chatId: item.chatId,
          interval: null,
          status: "cancelled",
        };
        slimbot.sendMessage(item.chatId, "Cancelled your request! Thanks.");
      }
    } else if (text.indexOf("/status") !== -1) {
      const [, id] = text.split(" ");
      const item = StupidStorage[id];
      if (item) {
        slimbot.sendMessage(chat.id, `Status: ${item.status}`);
      } else {
        slimbot.sendMessage(
          chat.id,
          "Not found! Are you sure that's the right identifier?"
        );
      }
    }
  });

  slimbot.startPolling();
};

const main = async () => {
  startBot();
};

try {
  main();
} catch (err) {
  console.error(err);
}
