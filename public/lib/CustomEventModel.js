import { EventModel } from '../schedulerpro.module.js';

// A custom task class with a few extra fields
export default class CustomEventModel extends EventModel {
    static get fields() {
        return [
            { name : 'name', type : 'string', defaultValue : 'New booking' },
            { name : 'price', type : 'number' },
            { name : 'guests', type : 'number' },
            { name : 'status', type : 'number' },
            { name : 'agent' }
        ];
    }
}