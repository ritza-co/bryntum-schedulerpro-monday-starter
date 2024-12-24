# How to connect and sync Bryntum Scheduler Pro to monday.com: starter repository

The code for the complete app is on the "completed-app" branch.

## Getting started

Install the dependencies:

```bash
npm install
```

Create the monday.com board and then create an environment variables file `.env` in the root directory with the following variables:

```
PORT=1338
MONDAY_ACCESS_TOKEN=
MONDAY_BOARD_ID=
```

Run the development server for this Express app using the following command:

```bash
npm start
```

Open http://localhost:1338, 