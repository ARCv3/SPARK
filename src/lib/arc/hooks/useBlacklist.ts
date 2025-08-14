import { Cacheables } from "cacheables";
import { Arc3 } from "../arc3.js";
import Blacklist from "../schema/v1/Blacklist.js";

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
mongooseLong(mongoose);
const { Types: { Long, ObjectId} } = mongoose;


const blacklistCache = new Cacheables({
    logTiming: false,
    log: false
});

const logger = Arc3.Arc3.clientLogger.child("useBlacklist");

export const useBlacklist = () => {
    if ( !blacklistCache.isCached("blacklist") ) {
        buildCache().then( x => {
            logger.info("Building blacklist cache...")
        })
    }

    async function buildCache() {

        return blacklistCache.cacheable(async () => {

            const blacklist: Record<string, Record<string, string[]>> = {};
            const blacklists = await Blacklist.find();

            blacklists.forEach(x => {

                const guildSnowflake = x.guildsnowflake?.toString()?? "undefined";
                const blacklistKey = x.cmd?.toString()?? "undefined";
                const userSnowflake = x.usersnowflake?.toString()?? "undefined";

                if (!(guildSnowflake in blacklist))
                    blacklist[guildSnowflake] = {}

                if (!(userSnowflake in blacklist[guildSnowflake]))
                    blacklist[guildSnowflake][userSnowflake] = []

                blacklist[guildSnowflake][userSnowflake].push(blacklistKey);

            });

            return blacklist;

        }, 'blacklist', { cachePolicy: 'cache-only'});

    }

    async function getBlacklist(guildSnowflake: string, userSnowflake: string, key: string) : Promise<boolean> {
        const blacklist = await buildCache();
        try {
            return blacklist[guildSnowflake][userSnowflake].includes(key) || blacklist['0'][userSnowflake].includes(key);
        } catch {
            return false;
        }
    }

    async function setBlacklist(guildSnowflake: string, userSnowflake: string, key: string) {

        const blacklist = new Blacklist({
            _id: ObjectId.createFromTime(new Date().getTime()),
            guildsnowflake: Long.fromString(guildSnowflake),
            usersnowflake: Long.fromString(userSnowflake),
            cmd: key
        });

        await blacklist.save();
        blacklistCache.delete('blacklist');

    }

    async function clearBlacklist(guildSnowflake: string, userSnowflake: string, key: string) {
        await Blacklist.deleteOne({
            guildsnowflake: Long.fromString(guildSnowflake),
            usersnowflake: Long.fromString(userSnowflake),
            cmd: key
        });
        blacklistCache.delete('blacklist');
    }

    return {
        actions: {
            getBlacklist, 
            setBlacklist,
            clearBlacklist,
        },
        states: {
            blacklistCache,
            logger
        }
    }


}