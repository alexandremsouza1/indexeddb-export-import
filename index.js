'use strict';

/**
 * Export all data from an IndexedDB database
 * @param {IDBDatabase} idbDatabase - to export from
 * @param {function(Object?, string?)} cb - callback with signature (error, jsonString)
 */
function exportToJsonString(idbDatabase, cb) {
  const exportObject = {};
  if (idbDatabase.objectStoreNames.length === 0) {
    cb(null, JSON.stringify(exportObject));
  } else {
    const transaction = idbDatabase.transaction(
        idbDatabase.objectStoreNames,
        'readonly'
    );
    transaction.onerror = (event) => cb(event, null);

    Array.from(idbDatabase.objectStoreNames).forEach((storeName) => {
      const allObjects = [];
      transaction.objectStore(storeName).openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          allObjects.push(cursor.value);
          cursor.continue();
        } else {
          exportObject[storeName] = allObjects;
          if (
            idbDatabase.objectStoreNames.length ===
            Object.keys(exportObject).length
          ) {
            cb(null, JSON.stringify(exportObject));
          }
        }
      };
    });
  }
}

/**
 * Import data from JSON into an IndexedDB database. This does not delete any existing data
 *  from the database, so keys could clash
 *
 * @param {IDBDatabase} idbDatabase - to import into
 * @param {string} jsonString - data to import, one key per object store
 * @param {function(Object)} cb - callback with signature (error), where error is null on success
 */
function importFromJsonString(idbDatabase, jsonString, cb) {
  const transaction = idbDatabase.transaction(
      idbDatabase.objectStoreNames,
      'readwrite'
  );
  transaction.onerror = (event) => cb(event);

  const importObject = JSON.parse(jsonString);
  Array.from(idbDatabase.objectStoreNames).forEach((storeName) => {
    let count = 0;
    Array.from(importObject[storeName]).forEach((toAdd) => {
      const request = transaction.objectStore(storeName).add(toAdd);
      request.onsuccess = () => {
        count++;
        if (count === importObject[storeName].length) {
          // added all objects for this store
          delete importObject[storeName];
          if (Object.keys(importObject).length === 0) {
            // added all object stores
            cb(null);
          }
        }
      };
    });
  });
}

/**
 * Clears a database of all data
 *
 * @param {IDBDatabase} idbDatabase - to delete all data from
 * @param {function(Object)} cb - callback with signature (error), where error is null on success
 */
function clearDatabase(idbDatabase, cb) {
  const transaction = idbDatabase.transaction(
      idbDatabase.objectStoreNames,
      'readwrite'
  );
  transaction.onerror = (event) => cb(event);

  let count = 0;
  Array.from(idbDatabase.objectStoreNames).forEach(function(storeName) {
    transaction.objectStore(storeName).clear().onsuccess = () => {
      count++;
      if (count === idbDatabase.objectStoreNames.length) {
        // cleared all object stores
        cb(null);
      }
    };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  // We are running on Node.js so need to export the module
  module.exports = {
    exportToJsonString: exportToJsonString,
    importFromJsonString: importFromJsonString,
    clearDatabase: clearDatabase,
  };
}
