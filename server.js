import express from 'express';
import path from 'path';
import 'dotenv/config';
import mondaySdk from 'monday-sdk-js';

global.__dirname = path.resolve();

const port = process.env.PORT || 1338;

const app = express();

app.use(
    express.static(path.join(__dirname, '/node_modules/@bryntum/schedulerpro'))
);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const monday = mondaySdk();
monday.setApiVersion('2024-10');
monday.setToken(process.env.MONDAY_ACCESS_TOKEN);

app.get('/api/load', async(req, res) => {
    try {
        const mondayAPIresponse = await monday.api(`
            {
                boards(limit: 2) {
                    id
                    items_page {
                    items {
                        id
                        name
                        column_values {
                            text
                            value 
                            column {
                                title
                                settings_str
                                }
                            }
                        }
                    }
                }
            }`);

        const bookingBoardItems = mondayAPIresponse.data.boards[1].items_page.items;
        let resourcesData = [];
        const eventsData = [];
        const assignmentsData = [];
        const statusValues = [];

        bookingBoardItems.forEach((item, i) => {
            const event = {};
            event.id = item.id;
            event.name = item.name;

            item.column_values.forEach((columnValue) => {
                if (columnValue.column.title === 'Property') {
                    if (i === 0) {
                        const settings_str = JSON.parse(columnValue.column.settings_str);
                        resourcesData = [...settings_str.labels];
                    }
                    if (columnValue.value) {
                        const resourceIds = JSON.parse(columnValue.value).ids;
                        resourceIds.forEach((resourceId) => {
                            assignmentsData.push({ event : event.id, resource : resourceId });
                        });
                    }
                }
                if (columnValue.column.title === 'Dates' && columnValue.value) {
                    const columnValueParsed = JSON.parse(columnValue.value);
                    event.startDate = columnValueParsed.from;
                    event.endDate = columnValueParsed.to;
                }
                if (columnValue.column.title === 'Price') {
                    event.price = parseFloat(columnValue.text);
                }
                if (columnValue.column.title === 'Number of guests') {
                    event.guests = parseInt(columnValue.text);
                }
                if (columnValue.column.title === 'Status' && columnValue.value) {
                    if (i === 0) {
                        const settings_str = JSON.parse(columnValue.column.settings_str);
                        for (const [key, value] of Object.entries(settings_str.labels)) {
                            statusValues.push({
                                value : parseInt(key),
                                text  : value,
                                color : settings_str.labels_colors[key].color
                            });
                        }
                    }
                    event.status = JSON.parse(columnValue.value).index;
                }
                if (columnValue.column.title === 'Booking agent') {
                    event.agent = columnValue.text;
                }
                if (columnValue.column.title === 'Notes') {
                    event.note = columnValue.text;
                }
            });
            eventsData.push(event);
        });

        if (mondayAPIresponse.errors)  {
            const errors = mondayAPIresponse.errors.map(error => error.message).join(', ');
            throw new Error(errors);
        }

        res.send({
            success   : true,
            statusValues,
            resources : {
                rows : resourcesData
            },
            events : {
                rows : eventsData
            },
            assignments : {
                rows : assignmentsData
            }
        }).status(200);
    }
    catch (error) {
        console.error({ error });
        res.send({
            success : false,
            message : 'There was an error loading the Monday boards data.'
        });
    }
});

app.post('/api/create', async(req, res) => {
    try {
        const mondayApiResponse = await monday.api(`
            mutation {
                create_item(
                    board_id: ${process.env.MONDAY_BOARD_ID},
                    item_name: "${req.body.item_name}",
                    column_values: "${JSON.stringify(req.body.column_values).replace(/"/g, '\\"')}"
                ) {
                id
            }
        }`);

        if (mondayApiResponse.errors)  {
            const errors = mondayApiResponse.errors.map(error => error.message).join(', ');
            throw new Error(errors);
        }

        res.send({ id : mondayApiResponse.data.create_item.id }).status(200);
    }
    catch (error) {
        console.error({ error });
        res.send({
            success : false,
            message : 'There was an error creating the Monday board item.'
        });
    }
});

app.delete('/api/delete/:id', async(req, res) => {
    try {
        await monday.api(`
            mutation {
                delete_item(item_id: ${req.params.id}) {
                    id
                }
            }`);

        if (res.errors)  {
            const errors = res.errors.map(error => error.message).join(', ');
            throw new Error(errors);
        }

        res.send({ success : true }).status(200);
    }
    catch (error) {
        console.error({ error });
        res.send({
            success : false,
            message : 'There was an error deleting the Monday board item.'
        });
    }
});

app.patch('/api/update/:id', async(req, res) => {
    try {
        const response = await monday.api(`
            mutation {
                change_multiple_column_values(
                    board_id: ${process.env.MONDAY_BOARD_ID},
                    item_id: ${req.params.id},
                    column_values: "${JSON.stringify(req.body.column_values).replace(/"/g, '\\"')}"
                ) {
                id
            }
        }`);

        if (response.errors)  {
            const errors = response.errors.map(error => error.message).join(', ');
            throw new Error(errors);
        }

        res.send({ success : true }).status(200);
    }
    catch (error) {
        console.error({ error });
        res.send({
            success : false,
            message : 'There was an error creating the Monday board item.'
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
