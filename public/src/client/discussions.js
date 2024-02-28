'use strict';

const db = require('../database');
const privileges = require('../privileges');

const discussionsAPI = module.exports;

discussionsAPI.search = async function (caller, data) {
    if (!data) {
        throw new Error('Invalid data provided');
    }

    // Check if the caller has the privilege to search discussions
    const allowed = await privileges.global.can('search:discussions', caller.uid);
    if (!allowed) {
        throw new Error('Insufficient privileges to perform the search');
    }

    // Extract search parameters from the request data
    const { query, category, page = 1, sortBy = 'recent' } = data;

    // Perform the discussion search based on the provided parameters
    return await searchDiscussions(query, category, page, sortBy);
};

async function searchDiscussions(query, category, page, sortBy) {
    // Perform the actual search logic here, such as querying the database
    // You can customize this function based on your application's requirements
    // For demonstration purposes, let's assume we are querying the database
    // and fetching discussion posts that match the search criteria
    const discussions = await db.searchDiscussions(query, category, page, sortBy);

    // Return the search results
    return discussions;
}
