import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Blacklist schema - declare mocks before jest.mock
const mockBlacklistSave = jest.fn() as jest.MockedFunction<() => Promise<void>>;
const mockBlacklistDeleteOne = jest.fn() as jest.MockedFunction<(query: any) => Promise<{deletedCount: number}>>;
const mockBlacklistFind = jest.fn() as jest.MockedFunction<() => Promise<any[]>>;

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

jest.mock('../../schema/v1/Blacklist.js', () => {
  const mockConstructor = jest.fn().mockImplementation((data: any) => ({
    ...(data || {}),
    save: mockBlacklistSave,
  }));
  
  // Add static methods to the constructor
  Object.assign(mockConstructor, {
    find: mockBlacklistFind,
    deleteOne: mockBlacklistDeleteOne,
  });
  
  return { default: mockConstructor };
});

import { useBlacklist } from '../useBlacklist';

describe('useBlacklist', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize correctly and return actions and states', () => {
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useBlacklist();

    expect(result).toHaveProperty('actions');
    expect(result).toHaveProperty('states');
    expect(result.actions).toHaveProperty('getBlacklist');
    expect(result.actions).toHaveProperty('setBlacklist');
    expect(result.actions).toHaveProperty('clearBlacklist');
    expect(result.states).toHaveProperty('blacklistCache');
    expect(result.states).toHaveProperty('logger');
  });

  it('should build cache correctly from database records', async () => {
    const mockBlacklists = [
      {
        guildsnowflake: { toString: () => '123456789' },
        usersnowflake: { toString: () => '987654321' },
        cmd: { toString: () => 'ban' },
      },
      {
        guildsnowflake: { toString: () => '123456789' },
        usersnowflake: { toString: () => '987654321' },
        cmd: { toString: () => 'kick' },
      },
    ];

    mockBlacklistFind.mockResolvedValue(mockBlacklists);
    (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockImplementation(async (fn: () => Promise<any>) => await fn());
    mockCacheInstance.isCached.mockReturnValue(true);

    const result = useBlacklist();
    
    // Call buildCache indirectly through getBlacklist
    await result.actions.getBlacklist('123456789', '987654321', 'ban');

    expect(mockBlacklistFind).toHaveBeenCalled();
  });

  describe('getBlacklist', () => {
    beforeEach(() => {
      mockCacheInstance.isCached.mockReturnValue(true);
    });

    it('should return false when user is not blacklisted', async () => {
      const mockBlacklistData = {
        '123456789': {
          '987654321': ['kick'],
        },
        '0': {
          '987654321': [],
        },
      };

      (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockResolvedValue(mockBlacklistData);

      const result = useBlacklist();
      const isBlacklisted = await result.actions.getBlacklist('123456789', '987654321', 'ban');

      expect(isBlacklisted).toBe(false);
    });

    it('should handle exceptions gracefully and return false', async () => {
      (mockCacheInstance.cacheable as jest.MockedFunction<any>).mockResolvedValue({});

      const result = useBlacklist();
      const isBlacklisted = await result.actions.getBlacklist('123456789', '987654321', 'ban');

      expect(isBlacklisted).toBe(false);
    });
  });

  describe('setBlacklist', () => {
    beforeEach(() => {
      mockCacheInstance.isCached.mockReturnValue(true);
      mockBlacklistSave.mockResolvedValue();
    });

    it('should create and save new blacklist entry', async () => {
      const result = useBlacklist();
      await result.actions.setBlacklist('123456789', '987654321', 'ban');

      expect(mockBlacklistSave).toHaveBeenCalled();
      expect(mockCacheInstance.delete).toHaveBeenCalledWith('blacklist');
    });
  });

  describe('clearBlacklist', () => {
    beforeEach(() => {
      mockCacheInstance.isCached.mockReturnValue(true);
      mockBlacklistDeleteOne.mockResolvedValue({ deletedCount: 1 });
    });

    it('should delete blacklist entry', async () => {
      const result = useBlacklist();
      await result.actions.clearBlacklist('123456789', '987654321', 'ban');

      expect(mockBlacklistDeleteOne).toHaveBeenCalled();
      expect(mockCacheInstance.delete).toHaveBeenCalledWith('blacklist');
    });
  });
});