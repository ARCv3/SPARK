import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock GuildConfig schema - declare mocks before jest.mock
const mockGuildConfigSave = jest.fn() as jest.MockedFunction<() => Promise<void>>;
const mockGuildConfigFind = jest.fn() as jest.MockedFunction<() => Promise<any[]>>;

// Create mock instances that will be used by the module
const mockCacheInstance = {
  cacheable: jest.fn() as jest.MockedFunction<any>,
  isCached: jest.fn() as jest.MockedFunction<any>,
  delete: jest.fn() as jest.MockedFunction<any>,
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock Cacheables
jest.mock('cacheables', () => ({
  Cacheables: jest.fn().mockImplementation(() => mockCacheInstance),
}));

// Mock Arc3
jest.mock('../../arc/arc3.js', () => ({
  Arc3: {
    Arc3: {
      clientLogger: {
        child: jest.fn(() => mockLogger),
      },
    },
  },
}));

// Mock mongoose and mongoose-long
jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    Types: {
      Long: {
        fromString: jest.fn((str) => ({ toString: () => str })),
      },
      ObjectId: {
        createFromTime: jest.fn((time) => ({ _id: `generated_${time}` })),
      },
    },
  },
  Types: {
    Long: {
      fromString: jest.fn((str) => ({ toString: () => str })),
    },
    ObjectId: {
      createFromTime: jest.fn((time) => ({ _id: `generated_${time}` })),
    },
  },
}));

jest.mock('mongoose-long', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((mongoose) => mongoose),
}));

jest.mock('../../schema/v1/GuildConfig.js', () => {
  const mockConstructor = jest.fn().mockImplementation((data: any) => ({
    ...(data || {}),
    save: mockGuildConfigSave,
  }));
  
  // Add static methods to the constructor
  Object.assign(mockConstructor, {
    find: mockGuildConfigFind,
  });
  
  return { default: mockConstructor };
});

import { useGuildConfig } from '../useGuildConfig';

describe('useGuildConfig', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize correctly and return actions and states', () => {
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useGuildConfig();

    expect(result).toHaveProperty('actions');
    expect(result).toHaveProperty('states');
    expect(result.actions).toHaveProperty('getGuildConfig');
    expect(result.actions).toHaveProperty('getConfig');
    expect(result.actions).toHaveProperty('setConfig');
    expect(result.actions).toHaveProperty('buildCache');
    expect(result.states).toHaveProperty('guildConfigCache');
    expect(result.states).toHaveProperty('logger');
  });

  it('should build cache correctly from database records', async () => {
    const mockGuildConfigs = [
      {
        guildsnowflake: { toString: () => '123456789' },
        configkey: 'modmail_channel',
        configvalue: '987654321',
      },
      {
        guildsnowflake: { toString: () => '123456789' },
        configkey: 'log_channel',
        configvalue: '111111111',
      },
    ];

    mockGuildConfigFind.mockResolvedValue(mockGuildConfigs);
    (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockImplementation(async (fn: () => Promise<any>) => await fn());
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useGuildConfig();
    const configData = await result.actions.buildCache();

    expect(mockGuildConfigFind).toHaveBeenCalled();
    expect(configData).toBeDefined();
  });

  describe('getConfig', () => {
    beforeEach(() => {
      mockCacheInstance.isCached.mockReturnValue(true);
    });

    it('should handle non-existent guild gracefully', async () => {
      const mockConfigData = {
        '123456789': {
          'modmail_channel': '987654321',
        },
      };

      (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockResolvedValue(mockConfigData);

      const result = useGuildConfig();
      
      // This should not throw an error even if guild doesn't exist
      await expect(result.actions.getConfig('999999999', 'modmail_channel')).resolves.not.toThrow();
    });
  });

  describe('getGuildConfig', () => {
    beforeEach(() => {
      mockCacheInstance.isCached.mockReturnValue(true);
    });

    it('should handle non-existent guild gracefully', async () => {
      const mockConfigData = {
        '123456789': {
          'modmail_channel': '987654321',
        },
      };

      (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockResolvedValue(mockConfigData);

      const result = useGuildConfig();
      
      // This should not throw an error even if guild doesn't exist
      await expect(result.actions.getGuildConfig('999999999')).resolves.not.toThrow();
    });
  });

  describe('setConfig', () => {
    beforeEach(() => {
      mockCacheInstance.isCached.mockReturnValue(true);
      mockGuildConfigSave.mockResolvedValue();
    });

    it('should create and save new config entry', async () => {
      const result = useGuildConfig();
      await result.actions.setConfig('123456789', 'modmail_channel', '987654321');

      expect(mockGuildConfigSave).toHaveBeenCalled();
      expect(mockCacheInstance.delete).toHaveBeenCalledWith('guildConfigs');
    });

    it('should handle save errors', async () => {
      const mockError = new Error('Database save failed');
      mockGuildConfigSave.mockRejectedValueOnce(mockError);

      const result = useGuildConfig();

      await expect(result.actions.setConfig('123456789', 'modmail_channel', '987654321'))
        .rejects.toThrow('Database save failed');
    });
  });

  it('should handle empty config response', async () => {
    mockGuildConfigFind.mockResolvedValue([]);
    (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockImplementation(async (fn: () => Promise<any>) => await fn());
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useGuildConfig();
    const configData = await result.actions.buildCache();

    expect(configData).toEqual({});
    expect(mockGuildConfigFind).toHaveBeenCalledWith();
  });
});