'use strict';

define('forum/discussion', [
    'translator', 'benchpress', 'api', 'alerts'
], function (translator, Benchpress, api, alerts) {
    const Discussion = {};

    let searchResultCount = 0;

    Discussion.init = function () {
        app.enterRoom('discussion_list');
        console.log('Entered discussion.js file');

        Discussion.handleSearch();
    };

    Discussion.handleSearch = function (params) {
        searchResultCount = params && params.resultCount;
        console.log("Search is active");
        $('#search-discussion').on('keyup', utils.debounce(doSearch, 250));
        $('.search select, .search input[type="checkbox"]').on('change', doSearch);
    };

    function doSearch() {
        if (!ajaxify.data.template.discussions) {
            return;
        }
        console.log('Doing search')
        $('[component="discussion/search/icon"]').removeClass('fa-search').addClass('fa-spinner fa-spin');
        const query = $('#search-discussion').val();
        console.log(query);

        const queryParams = {
            page: 1,
        };

        if (!query) {
            return loadPage(queryParams);
        }

        queryParams.query = query;
        queryParams.sortBy = getSortBy();

        loadPage(queryParams);
    }

    function getSortBy() {
        return 'relevant'; // Adjust the sorting method as needed
    }

    function loadPage(queryParams) {
        api.get('/api/discussions', queryParams)
            .then(renderSearchResults)
            .catch(alerts.error);
    }

    function renderSearchResults(data) {
        Benchpress.render('partials/paginator', { pagination: data.pagination }).then(function (html) {
            $('.pagination-container').replaceWith(html);
        });

        if (searchResultCount) {
            data.discussions = data.discussions.slice(0, searchResultCount);
        }

        app.parseAndTranslate('discussions', 'discussions', data, function (html) {
            $('#discussions-container').html(html);
            html.find('span.timeago').timeago();
            $('[component="discussion/search/icon"]').addClass('fa-search').removeClass('fa-spinner fa-spin');
        });
    }

    return Discussion;
});
