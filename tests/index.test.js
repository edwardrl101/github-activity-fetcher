import test from "node:test";
import assert from "node:assert/strict";
import { capitalize, displayActivity, getUserActivity, main } from "../index.js";

process.exitCode = 0;

test("capitalize uppercases first letter", () => {
    assert.equal(capitalize("opened"), "Opened");
    assert.equal(capitalize(""), "");
});

test("getUserActivity returns parsed JSON on success", async () => {
    const originalFetch = globalThis.fetch;
    const expected = [{ type: "PushEvent" }];

    globalThis.fetch = async () => ({
        ok: true,
        json: async () => expected,
    });

    try {
        const result = await getUserActivity("octocat");
        assert.deepEqual(result, expected);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("getUserActivity throws wrapped HTTP error", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => ({
        ok: false,
        status: 404,
        statusText: "Not Found",
    });

    try {
        await assert.rejects(
            () => getUserActivity("missing-user"),
            /Error fetching data: HTTP 404: Not Found/
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("displayActivity logs known events and skips unknown events", () => {
    const originalLog = console.log;
    const logs = [];
    console.log = (message) => logs.push(message);

    try {
        displayActivity([
            { type: "PushEvent", repo: { name: "owner/repo-a" }, payload: {} },
            { type: "UnknownEvent", repo: { name: "owner/repo-b" }, payload: {} },
            {
                type: "IssuesEvent",
                repo: { name: "owner/repo-c" },
                payload: { action: "opened" },
            },
        ]);

        assert.deepEqual(logs, [
            "- Pushed to owner/repo-a",
            "- Opened an issue in owner/repo-c",
        ]);
    } finally {
        console.log = originalLog;
    }
});

test("main reports usage when username is missing", async () => {
    const originalArgv = process.argv;
    const originalError = console.error;
    const originalExitCode = process.exitCode;
    const errors = [];

    process.argv = ["node", "index.js"];
    process.exitCode = 0;
    console.error = (message) => errors.push(message);

    try {
        await main();
        assert.equal(process.exitCode, 1);
        assert.deepEqual(errors, ["Usage: github-activity <username>"]);
    } finally {
        process.argv = originalArgv;
        console.error = originalError;
        process.exitCode = originalExitCode;
    }
});

test("main fetches and prints activity for a username", async () => {
    const originalArgv = process.argv;
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;
    const originalError = console.error;
    const originalExitCode = process.exitCode;
    const logs = [];
    const errors = [];

    process.argv = ["node", "index.js", "octocat"];
    process.exitCode = 0;
    console.log = (message) => logs.push(message);
    console.error = (message) => errors.push(message);
    globalThis.fetch = async () => ({
        ok: true,
        json: async () => [
            { type: "WatchEvent", repo: { name: "owner/repo" }, payload: {} },
        ],
    });

    try {
        await main();
        assert.equal(process.exitCode, 0);
        assert.deepEqual(errors, []);
        assert.deepEqual(logs, ["- Starred owner/repo"]);
    } finally {
        process.argv = originalArgv;
        globalThis.fetch = originalFetch;
        console.log = originalLog;
        console.error = originalError;
        process.exitCode = originalExitCode;
    }
});
