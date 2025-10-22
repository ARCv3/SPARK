import { Cacheables } from "cacheables"
import GuildConfig from "../schema/v1/GuildConfig.js";
import { Arc3 } from "../arc3.js"

import mongoose from 'mongoose';
import mongooseLong from 'mongoose-long'
mongooseLong(mongoose);
const { Types: { Long, ObjectId} } = mongoose;


const guildConfigCache = new Cacheables({
    logTiming: false,
    log: false,
});

const logger = Arc3.Arc3.clientLogger.child("useGuildCache");

export const useGuildConfig = () => {
    
    if ( !guildConfigCache.isCached('guildConfigs') ) {

        buildCache().then( x => {
            logger.info("Building guild config cache...");
        })

    }

    async function buildCache() {

        return guildConfigCache.cacheable(async () => {

            const config : Record<string, Record<string, string>> = {};
            const guildConfigs = await GuildConfig.find();

            guildConfigs.forEach(x => {
                
                const guildSnowflake = x.guildsnowflake?.toString() ?? "undefined";
                const configKey = x.configkey ?? "unknown";

                if (!config[guildSnowflake])
                    config[guildSnowflake] = {};

                config[guildSnowflake][configKey] = x.configvalue ?? "undefined";
            
            })

            return config;

        }, 'guildConfigs', { cachePolicy: 'cache-only'});
    }

    async function setConfig(guildSnowflake: string, configKey: string, configValue: string) {
        
        const config = new GuildConfig({
            _id: ObjectId.createFromTime(new Date().getTime()),
            guildsnowflake: Long.fromString(guildSnowflake),
            configkey: configKey,
            configvalue: configValue
        });

        await config.save();
        guildConfigCache.delete("guildConfigs");

    }

    async function getConfig(guildSnowflake: string, configKey: string) {
        const config = await buildCache();
        return config[guildSnowflake]?.[configKey];
    }

    async function getGuildConfig(guildSnowflake: string) {
        const config = await buildCache();
        return config[guildSnowflake];
    }

    return {
        actions: {
            getGuildConfig,
            getConfig,
            setConfig,
            buildCache
        },
        states: {
            guildConfigCache,
            logger
        }
    }

}