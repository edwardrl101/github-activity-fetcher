#!/usr/bin/env node

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function fetchGitHub(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        throw new Error(`Error fetching data: ${error.message}`, {cause: error});
    }
}

async function getUserInfo(username){
    return fetchGitHub(`https://api.github.com/users/${username}`);
}

async function getUserActivity(username){
    return fetchGitHub(`https://api.github.com/users/${username}/events`);
}

function displayUser(user) {
    console.log("User Info\n")
    console.log(user.login);
    console.log(`Followers: ${user.followers}`);
    console.log(`Following: ${user.following}`);
    console.log(`Public Repos: ${user.public_repos}`);
}

function displayActivity(events) {
    console.log("Recent Activity");
    console.log("---------");
    events.forEach((event) => {
        let action;
        switch(event.type) {
            case "PushEvent":
                action = `Pushed to ${event.repo.name}`;
                break;
            
            case "CreateEvent":
                action = `Created ${event.payload.ref_type} ${event.payload.ref} in ${event.repo.name}`;
                break;
            
            case "DeleteEvent":
                action = `Deleted a ${event.payload.ref_type} in ${event.repo.name}`;
                break;
            
            case "PublicEvent":
                action = `Made ${event.repo.name} public`;
                break;
            
            case "WatchEvent":
                action = `Starred ${event.repo.name}`;
                break;

            case "IssuesEvent":
                action = `${capitalize(event.payload.action)} an issue in ${event.repo.name}`;
                break;

            case "PullRequestEvent":
                action = `${capitalize(event.payload.action)} a pull request in ${event.repo.name}`;
                break;
            
            case "ForkEvent":
                action = `Forked ${event.repo.name}`;
                break;

            default: 
                return;
        }
        console.log(`- ${action}`);
    });
}

async function main() {
    try {
        const username = process.argv[2];

    if (!username) {
        throw new Error("Usage: github-activity <username>");
    }

    const [user, events] = await Promise.all([
        getUserInfo(username),
        getUserActivity(username)
    ]);

    displayUser(user);
    console.log("");
    displayActivity(events);
    } catch(err) {
        process.exitCode = 1;
        console.error(err.message);
    }
}

main();

export { capitalize, displayActivity, getUserActivity, main };