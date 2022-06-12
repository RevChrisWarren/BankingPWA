//create a variable to hold the db connection

let db
// establish a connection to IndexedDB database called "budget-tracker" and set the version to 1
const request = indexedDB.open('budget_tracker', 1);

//this event will emit if the database version changes
request.onupgradeneeded = function (event) {
    // save a reference to the database
    const db = event.target.result;
    //create an object store called 'new-transaction', and set it to auto increment
    db.createObjectStore('new_transaction', { autoIncrement: true });
};

//upon success
request.onsuccess = function (event) {
    //when DB is successfully creater with its object store, or establishes connection, save reference to db in a global variable
    db = event.target.result;

    //check if app is online, if yes run upload function to send all local db data to api
    if (navigator.onLine) {
        uploadTransaction();
    }
};

request.onerror = function (event) {
    console.log(event.target.errorCode);
};

//This function will be executed is we attempt to submit a new transaction and there's no internet connection
function saveRecord(record) {
    //open a new transaction with the database with read and write permissions
    const transaction = db.transaction(['new_transaction'], 'readwrite');

    //access the object store for 'new_transaction'
    const transactionObjectStore = transaction.objectStore('new_transaction');

    //add record to the store with add method
    transactionObjectStore.add(record);
}

function uploadTransaction() {
    //open a transaction on the db
    const transaction = db.transaction(['new_transaction'], 'readwrite');

    //access the object store
    const transactionObjectStore = transaction.objectStore('new_transaction');

    // get all records from store and set to a variable
    const getAll = transactionObjectStore.getAll();

    //upo successful .getAll() execution, run this function
    getAll.onsuccess = function () {
        //if there was data in the indexedDB store, send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: "POST",
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    }
                    //open one more transaction
                    const transaction = db.transaction(['new_transaction'], 'readwrite');
                    //access the new_transaction store
                    const transactionObjectStore = transaction.objectStore('new_transaction');
                    //clear all items in the store
                    transactionObjectStore.clear()

                    alert('All new transactions have been submitted')
                })
                .catch(err => {
                    console.log(err);
                })
        }
    }
};

//listen for app coming back online
window.addEventListener('online', uploadTransaction)