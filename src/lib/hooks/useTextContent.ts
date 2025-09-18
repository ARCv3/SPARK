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
        
        let textContent = translations[code];
        const argsRegexp = /{\d}/g
        
        const results = textContent.match(argsRegexp);

        results?.forEach(x => {
            const index = parseInt(x.replace(/[{}]/g, ''));
            textContent = textContent.replace(x, args[index]);
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
