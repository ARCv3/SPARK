import { Cacheables } from "cacheables";
import { Arc3 } from "../arc3.js"
import Modmail from "../schema/v1/Modmail.js";

const activeModmailsCache = new Cacheables({
    logTiming: false,
    log: false
});

const logger = Arc3.Arc3.clientLogger.child("useActiveModmails");

export const useActiveModmails = () => {

    async function buildCache() {
        return activeModmailsCache.cacheable(async () => {
            return await Modmail.find();
        }, "activemodmails", { cachePolicy: 'cache-only'})
    }

    if (!activeModmailsCache.isCached("activemodmails")) {
        buildCache();
    }

    return {
        actions: {
            buildCache
        },
        states: {
            activeModmailsCache,
            logger
        }
    }

}