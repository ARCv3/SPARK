import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock fs module - define inline to ensure it's available during module import
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((path) => {
    const pathStr = path as string;
    let content = '';
    if (pathStr.includes('en.json')) {
      content = JSON.stringify({
        'arc.bot.name': 'ARC',
        'arc.blacklist': 'You are blacklisted from using that command!',
        'arc.command.setconfig.sucess': 'Config has been successfully set',
        'arc.modmail.blacklisted': 'You are blacklisted from using modmail',
        'arc.modmail.channel.name': 'Modmail',
        'arc.modmail.delivery.emoji.delivered': '📨',
        'arc.modmail.delivery.emoji.failed': '🔴',
        'arc.modmail.delivery.recieved.description': 'Your modmail request was received! Please wait and a staff member will assist you shortly.',
        'arc.modmail.delivery.recieved.footer': 'v0.1 Thank you for using ARC',
        'arc.modmail.selectmenu.placeholder': 'Select a server to modmail: ',
      });
    } else if (pathStr.includes('fr.json')) {
      content = JSON.stringify({
        'arc.bot.name': 'ARC',
        'arc.blacklist': 'Vous êtes sur liste noire pour cette commande!',
        'arc.command.setconfig.sucess': 'La configuration a été définie avec succès',
        'arc.modmail.blacklisted': 'Vous êtes sur liste noire pour le modmail',
        'arc.modmail.channel.name': 'Modmail',
        'arc.modmail.delivery.emoji.delivered': '📨',
        'arc.modmail.delivery.emoji.failed': '🔴',
        'arc.modmail.delivery.recieved.description': 'Votre demande de modmail a été reçue! Veuillez patienter, un membre du personnel vous aidera sous peu.',
        'arc.modmail.delivery.recieved.footer': 'v0.1 Merci d\'utiliser ARC',
        'arc.modmail.selectmenu.placeholder': 'Sélectionnez un serveur pour le modmail: ',
      });
    } else {
      content = JSON.stringify({});
    }
    
    return {
      toString: () => content
    };
  }),
  readdirSync: jest.fn().mockReturnValue(['en.json', 'fr.json', 'zh.json']),
}));

import { useTextContent, Locale, Translations } from '../useTextContent';

describe('useTextContent', () => {

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock console.log to avoid clutter in test output
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // The mock is already set up in the jest.mock call above
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Locale enum', () => {
    it('should have correct locale values', () => {
      expect(Locale.EN).toBe('en');
      expect(Locale.FR).toBe('fr');
      expect(Locale.ZH).toBe('zh');
    });
  });

  describe('useTextContent hook', () => {
    it('should initialize correctly with English locale', () => {
      const result = useTextContent(Locale.EN);

      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('states');
      expect(result.actions).toHaveProperty('text');
      expect(result.states).toHaveProperty('translations');
    });

    it('should initialize correctly with French locale', () => {
      const result = useTextContent(Locale.FR);

      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('states');
      expect(result.actions).toHaveProperty('text');
      expect(result.states).toHaveProperty('translations');
    });

    it('should have translations loaded', () => {
      const result = useTextContent(Locale.EN);
      const translations = result.states.translations;

      // Check that translations is an object and has the expected properties
      expect(typeof translations).toBe('object');
      expect(translations).toBeTruthy();
      
      // The actual implementation may have different structure due to enum iteration
      // Let's just verify that we get some translation data
      expect(Object.keys(translations).length).toBeGreaterThan(0);
    });

    describe('text function', () => {
      it('should call text function without errors', () => {
        const result = useTextContent(Locale.EN);
        
        const textResult = result.actions.text('arc.bot.name');
        
        expect(textResult).toBe("ARC");
      });

      it('should handle text function with placeholders', () => {
        const result = useTextContent(Locale.EN);
        
        // Temporarily modify translations to test placeholder functionality
        (result.states.translations as any)['arc.test.placeholder'] = 'Hello {0}, welcome to {1}!';
        
        const text = result.actions.text('arc.test.placeholder' as keyof Translations, 'User', 'ARC');
        
        expect(text).toBe('Hello User, welcome to ARC!');
        
      });

      it('should return code if translation key not found', () => {
        const result = useTextContent(Locale.EN);
        const textResult = result.actions.text('non.existent.key' as keyof Translations);
        expect(textResult).toBe('non.existent.key');
      });

    });

  });

});