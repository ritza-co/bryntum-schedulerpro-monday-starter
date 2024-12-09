import CustomEventModel from './lib/CustomEventModel.js';
import { SchedulerPro, DateRangeField } from './schedulerpro.module.js';

const dateRangeWidget = new DateRangeField({
    autoExpand     : true,
    ref            : 'dateRangeField',
    label          : 'Dates',
    labelPosition  : 'above',
    fieldStartDate : 'startDateField',
    fieldEndDate   : 'endDateField',
    format         : 'Do MMM, YYYY',
    weight         : 410,
    required       : true
});

const schedulerPro = new SchedulerPro({
    appendTo   : 'scheduler',
    viewPreset : 'dayAndWeek',
    columns    : [
        { text : 'Property', field : 'name', width : 160, editor : false }
    ],
    features : {
        cellMenu     : false,
        dependencies : false,
        taskEdit     : {
            items : {
                generalTab : {
                    items : {
                        nameField : {
                            required      : true,
                            label         : 'Guest name',
                            labelPosition : 'above'
                        },
                        guestField : {
                            type          : 'number',
                            name          : 'guests',
                            label         : 'Number of guests',
                            labelPosition : 'above',
                            min           : 1,
                            // Place after end date
                            weight        : 150,

                            required : true
                        },
                        resourcesField : {
                            required      : true,
                            labelPosition : 'above'
                        },
                        dateRangeWidget,
                        startDateField   : false,
                        endDateField     : false,
                        durationField    : false,
                        percentDoneField : false,
                        effortField      : false,
                        priceField       : {
                            type          : 'number',
                            name          : 'price',
                            label         : 'Price',
                            labelPosition : 'above',
                            min           : 0,
                            weight        : 450,
                            required      : true
                        },
                        statusField : {
                            type          : 'combo',
                            name          : 'status',
                            label         : 'Status',
                            labelPosition : 'above',
                            weight        : 450,
                            required      : true,
                            onChange      : ({ source, value }) => {
                                const statusValues = {};
                                source.items.forEach(({ data }) => {
                                    statusValues[data.value] = data.color;

                                });
                                source.style = `color: ${statusValues[value]};`;
                            },
                            listItemTpl : item => `
                                <div style="flex: 1; padding: 0.8em; background-color: ${item.color}; color: white; text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);">
                                    ${item.text}
                                </div>
                            `
                        }
                    }
                },
                notesTab : {
                    tab : {
                        text : 'Notes',
                        icon : ''
                    }
                },
                predecessorsTab : false,
                successorsTab   : false,
                advancedTab     : false
            }
        },
        filterBar : true
    },
    project : {
        eventModelClass : CustomEventModel,
        onLoad          : ({ response }) => {
            schedulerPro.features.taskEdit.items.generalTab.
                items.statusField.items = response.statusValues;
        },
        loadUrl          : '/api/load',
        autoLoad         : true,
        // This config enables response validation and dumping of found errors to the browser console.
        // It's meant to be used as a development stage helper only so please set it to false for production systems.
        validateResponse : true
    },
    listeners : {
        beforeTaskEditShow({ editor, taskRecord }) {
            const dateRangeField = editor.widgetMap.dateRangeWidget;
            dateRangeField.value = [
                taskRecord.startDate,
                taskRecord.endDate
            ];
        },
        afterEventSave({ eventRecord, source }) {
            const dateRangeValue = source.features.taskEdit.items.generalTab.items.dateRangeWidget.value;
            eventRecord.startDate = dateRangeValue[0];
            eventRecord.endDate = dateRangeValue[1];
            if (eventRecord.id.startsWith('_generated')) {
                createMondayItem(eventRecord);
            }
            else {
                updateMondayItem(eventRecord);
            };
        },
        dataChange : function(event) {
            handleDataChange(event);
        }
    }
});

function handleDataChange({ action, record, store, records }) {
    const storeId = store.id;
    if (storeId === 'events') {
        if (action === 'update') {
            if (`${record.id}`.startsWith('_generated')) return;
            updateMondayItem(record);
        }
        if (action === 'remove') {
            const recordsData = records.map((record) => record.data);
            recordsData.forEach(async(record) => {
                if (record.id.startsWith('_generated')) return;
                fetch(`/api/delete/${record.id}`, {
                    method : 'DELETE'
                });
            });
        }
    }
}

function createMondayItem(eventRecord) {
    const resourceIds = eventRecord.resources.map(resource => resource.id);
    const startDate = new Date(eventRecord.startDate);
    const formattedStartDate= startDate.toISOString().split('T')[0];
    const endDate = new Date(eventRecord.endDate);
    const formattedEndDate= endDate.toISOString().split('T')[0];

    const boardItem = {
        dropdown9__1 : {
            ids : resourceIds
        },
        project_timeline : {
            from : formattedStartDate,
            to   : formattedEndDate
        },
        numbers__1     : eventRecord.price,
        numbers0__1    : eventRecord.guests,
        project_status : {
            index : eventRecord.status
        },
        text9 : eventRecord.note ? eventRecord.note : ''
    };

    fetch('/api/create', {
        method  : 'POST',
        headers : {
            'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
            item_name     : eventRecord.name,
            column_values : boardItem
        })
    }).then(async response => {
        const data = await response.json();
        schedulerPro.project.eventStore.applyChangeset({
            updated : [
                // Will set proper id for added event
                {
                    $PhantomId : eventRecord.id,
                    id         : data.id
                }
            ]
        });
    });
}

function updateMondayItem(eventRecord) {
    const resourceIds = eventRecord.resources.map(resource => resource.id);
    const startDate = new Date(eventRecord.startDate);
    const formattedStartDate= startDate.toISOString().split('T')[0];
    const endDate = new Date(eventRecord.endDate);
    const formattedEndDate= endDate.toISOString().split('T')[0];

    const boardItem = {
        name         : eventRecord.name,
        dropdown9__1 : {
            ids : resourceIds
        },
        project_timeline : {
            from : formattedStartDate,
            to   : formattedEndDate
        },
        numbers__1     : eventRecord.price,
        numbers0__1    : eventRecord.guests,
        project_status : {
            index : eventRecord.status
        },
        text9 : eventRecord.note ? eventRecord.note : ''
    };

    fetch(`/api/update/${eventRecord.id}`, {
        method  : 'PATCH',
        headers : {
            'Content-Type' : 'application/json'
        },
        body : JSON.stringify({
            item_name     : eventRecord.name,
            column_values : boardItem
        })
    });
}