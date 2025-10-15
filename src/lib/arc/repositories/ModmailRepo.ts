import { Logger } from "pino";
import { useActiveModmails } from "../../hooks/useActiveModmails.js";
import { Arc3 } from "../arc3.js";


export class ModmailRepo {

    private logger : Logger;
    private activeModmail = useActiveModmails();
    
    /**
     * ModmailEvents class constructor
     * Initializes the logger and modmail cache.
     * @constructor
     */
    constructor() {

        this.logger = Arc3.Arc3.clientLogger.child("ModmailRepo");
    
        this.initCaches().then( _ => {
            this.logger.info("Cache initialized");
        });

    }

    /**
     * Initializes the caches for modmail events.
     * It is called once when the class is instantiated.
     */
    private async initCaches() {
        await this.getActiveModmails();
    }

    /**
     * Retrieves active modmails from the database and caches them.
     * @returns {Promise<Array>} A promise that resolves to an array of active modmails.
     */
    public getActiveModmails = () =>  {
        return this.activeModmail.actions.buildCache();
    }
        
}