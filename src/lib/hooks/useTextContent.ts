import { readdirSync, readFileSync } from "fs";

export enum Locale {
    EN = 'en'
}

const translationFiles : Record<string, Translations> = {}

for (const locale in Locale) {
    translationFiles[locale] = JSON.parse(readFileSync(`./src/locales/${locale}.json`).toString()) as Translations;
}

export const useTextContent = (locale: Locale) => {

    const translations = translationFiles[locale];

    function text(code: keyof Translations) {
        return translations[code];
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
    
    'arc.bot.name': string; // ARC
    'arc.blacklist': string; // "You are blacklisted from using that command!"
    'arc.command.setconfig.sucess': string; // Config has been sucessfully set
    'arc.modmail.blacklisted': string; // "You are blacklisted from using modmail"
    'arc.modmail.channel.name': string; // Modmail
    'arc.modmail.delivery.emoji.delivered': string; // "📨"
    'arc.modmail.delivery.emoji.failed': string; // "🔴"
    'arc.modmail.delivery.recieved.description': string; // "Your modmail request was recieved! Please wait and a staff member will assist you shortly."
    'arc.modmail.delivery.recieved.footer': string; // v0.1 Thank you for using ARC
    'arc.modmail.selectmenu.placeholder': string; // "Select a server to modmail: "

}
