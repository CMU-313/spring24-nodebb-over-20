<!-- IMPORT partials/breadcrumbs.tpl -->
<div data-widget-area="header">
    {{{each widgets.header}}}
    {{widgets.header.html}}
    {{{end}}}
    
    <!-- Robert's Part fore now -->
    <!-- Stlying for the searchbar - margin to the right -->
    <style>
        .search {
            width: 25%; /* Set the width to a fourth of its original size */
            margin-right: 10px; /* Adjust the right margin */
        }
    </style>

    <!-- The script that identifies the slug and makes the search bar -->
    <script>
        // Check if it's the General Category Page by matching category ID
        if (ajaxify.data.slug === '2/general-discussion') {
            // Create search bar
            var searchBar = document.createElement("div");
            searchBar.className = "search";
            searchBar.innerHTML = `
                <div class="input-group">
                    <input class="form-control" id="search-discussion" type="text" placeholder="Search within discussion"/>
                    <span class="input-group-addon">
                        <i component="user/search/icon" class="fa fa-search"></i>
                    </span>
                </div>
            `;
            // Append search bar to the header
            document.querySelector('[data-widget-area="header"]').appendChild(searchBar);

            // Add event listener for input event
            document.addEventListener("input", function(event) {
                if (event.target.id === "search-discussion") {
                    console.log("Typed text:", event.target.value);
                }
            });
        }
    </script>
</div>

<!-- Rest of the code -->
<div class="row">
    <div class="category <!-- IF widgets.sidebar.length -->col-lg-9 col-sm-12<!-- ELSE -->col-lg-12<!-- ENDIF widgets.sidebar.length -->">
        <!-- IMPORT partials/category/subcategory.tpl -->

        <div class="topic-list-header clearfix">
            <!-- IF privileges.topics:create -->
            <a href="{config.relative_path}/compose?cid={cid}" component="category/post" id="new_topic" class="btn btn-primary" data-ajaxify="false" role="button">[[category:new_topic_button]]</a>
            <!-- ELSE -->
                <!-- IF !loggedIn -->
                <a component="category/post/guest" href="{config.relative_path}/login" class="btn btn-primary">[[category:guest-login-post]]</a>
                <!-- ENDIF !loggedIn -->
                <!-- ENDIF privileges.topics:create -->

            <a href="{url}" class="inline-block">
                <div class="alert alert-warning hide" id="new-topics-alert"></div>
            </a>

            <span class="pull-right" component="category/controls">
                <!-- IMPORT partials/category/watch.tpl -->
                <!-- IMPORT partials/category/sort.tpl -->
                <!-- IMPORT partials/category/tools.tpl -->
            </span>
        </div>

        <!-- IF !topics.length -->
        <!-- IF privileges.topics:create -->
        <hr class="visible-xs" />
        <div class="alert alert-warning" id="category-no-topics">
            [[category:no_topics]]
        </div>
        <!-- ENDIF privileges.topics:create -->
        <!-- ENDIF !topics.length -->

        <!-- IMPORT partials/topics_list.tpl -->

        <!-- IF config.usePagination -->
            <!-- IMPORT partials/paginator.tpl -->
        <!-- ENDIF config.usePagination -->
    </div>
    <div data-widget-area="sidebar" class="col-lg-3 col-sm-12 <!-- IF !widgets.sidebar.length -->hidden<!-- ENDIF !widgets.sidebar.length -->">
        {{{each widgets.sidebar}}}
        {{widgets.sidebar.html}}
        {{{end}}}
    </div>
</div>
<div data-widget-area="footer">
    {{{each widgets.footer}}}
    {{widgets.footer.html}}
    {{{end}}}
</div>

<!-- IF !config.usePagination -->
<noscript>
    <!-- IMPORT partials/paginator.tpl -->
</noscript>
<!-- ENDIF !config.usePagination -->
