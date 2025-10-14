import { readdirSync, readFileSync } from "fs";

export enum Locale {
    EN = 'en',
    FR = 'fr',
    ZH = 'zh'
}

const translationFiles : Record<string, Translations> = {}

for (let locale in Locale) {
    locale = locale.toLowerCase();
    translationFiles[locale] = JSON.parse(readFileSync(`./src/locales/${locale}.json`).toString()) as Translations;
}

export const useTextContent = (locale: Locale) => {

    const translations = translationFiles[locale];

    function text(code: keyof Translations, ...args: string[]): string {

        if (!(code in translations))
            return code;

        let textContent = translations[code];
        const argsRegexp = /{\d}/g
        
        const results = textContent.match(argsRegexp);

        results?.forEach((x : string) => {
            const index = parseInt(x.replace(/[{}]/g, ''));
            textContent = textContent.replace(x, args[index].toString());
        });

        return textContent;
    }

    return {
        actions: {
            text
        },
        states: {
            translations
        }
    }

}

export interface Translations {
    
    // Bot General
    'arc.blacklist': string; // "You are blacklisted from using that command!"
    'arc.bot.name': string; // ARC
    
    // Commands
    'arc.command.setconfig.sucess': string; // Config has been sucessfully set
    
    // Modmail - General
    'arc.modmail.blacklisted': string; // "You are blacklisted from using modmail"
    'arc.modmail.channel.name': string; // Modmail
    
    // Modmail - Delivery
    'arc.modmail.delivery.emoji.delivered': string; // "📨"
    'arc.modmail.delivery.emoji.failed': string; // "🔴"
    'arc.modmail.delivery.recieved.description': string; // "Your modmail request was recieved! Please wait and a staff member will assist you shortly."
    'arc.modmail.delivery.recieved.footer': string; // v0.1 Thank you for using ARC
    
    // Modmail - Menu Buttons
    'arc.modmail.menu.button.ban': string; // Ban
    'arc.modmail.menu.button.ban.emoji': string; // 🔨
    'arc.modmail.menu.button.ping': string; // Ping
    'arc.modmail.menu.button.ping.emoji': string; // 📣
    'arc.modmail.menu.button.save': string; // Save
    'arc.modmail.menu.button.save.emoji': string; // 💾
    
    // Modmail - Menu General
    'arc.modmail.menu.description': string; // A modmail session was opened with <@{0}>
    'arc.modmail.menu.footer': string; // ARC v{0} - Modmail
    'arc.modmail.menu.select.placeholder': string; // "Select a server to modmail: "
    'arc.modmail.menu.title': string; // Modmail
    
    

}
