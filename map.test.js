const assert = require('assert');

describe('Map Tests', () => {
    it('should return the correct size of the map', () => {
        const map = new Map();
        map.set('key1', 'value1');
        map.set('key2', 'value2');
        assert.strictEqual(map.size, 2);
    });

    it('should return the correct value for a given key', () => {
        const map = new Map();
        map.set('key1', 'value1');
        assert.strictEqual(map.get('key1'), 'value1');
    });

    it('should return undefined for a non-existent key', () => {
        const map = new Map();
        assert.strictEqual(map.get('nonExistentKey'), undefined);
    });
});