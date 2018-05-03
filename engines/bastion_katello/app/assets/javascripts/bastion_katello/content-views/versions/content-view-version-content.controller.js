(function () {
    'use strict';

    /**
     * @ngdoc controller
     * @name  Bastion.content-views.versions.controller:ContentViewVersionContent
     *
     * @description
     *   Handles fetching content view version content and populating Nutupane based on the current
     *   ui-router state.
     */
    function ContentViewVersionContentController($scope, translate, Nutupane, Package, Erratum,
                                                 PackageGroup, PuppetModule, OstreeBranch, Deb, Repository,
                                                 ContentViewVersion) {
        var nutupane, contentTypes, currentState, params;

        currentState = $scope.$state.current.name.split('.').pop();

        contentTypes = {
            'docker': {
                type: Repository,
                params: {
                    'content_type': "docker",
                    'content_view_version_id': $scope.$stateParams.versionId

                }
            },
            'yum': {
                type: Repository,
                params: {
                    'content_type': "yum",
                    'content_view_version_id': $scope.$stateParams.versionId,
                    library: true
                }
            },
            'packages': {
                type: Package
            },
            'package-groups': {
                type: PackageGroup,
                params: {
                    'sort_by': 'name',
                    'sort_order': 'ASC',
                    'content_view_version_id': $scope.$stateParams.versionId
                }
            },
            'errata': {
                type: Erratum
            },
            'puppet-modules': {
                type: PuppetModule
            },
            'ostree-branches': {
                type: OstreeBranch,
                params: {
                    'content_type': "ostree",
                    'content_view_version_id': $scope.$stateParams.versionId,
                    'sort_by': 'version_date',
                    'sort_order': 'DESC'
                }
            },
            'components': {
                type: ContentViewVersion,
                params: {
                    'composite_version_id': $scope.$stateParams.versionId
                }
            },
            'file': {
                type: Repository,
                params: {
                    'content_type': 'file',
                    'content_view_version_id': $scope.$stateParams.versionId,
                    library: true
                }
            },
            'apt': {
                type: Repository,
                params: {
                    'content_type': 'deb',
                    'content_view_version_id': $scope.$stateParams.versionId,
                    library: true
                }
            },
            'deb': {
                type: Deb
            }
        };

        params = contentTypes[currentState].params || {'content_view_version_id': $scope.$stateParams.versionId};

        nutupane = new Nutupane(contentTypes[currentState].type, params, 'queryPaged', { 'disableAutoLoad': true });
        nutupane.masterOnly = true;

        $scope.nutupane = nutupane;
        $scope.table = nutupane.table;

        $scope.repository = {name: translate('All Repositories'), id: 'all'};
        $scope.repositories = [];

        $scope.version.$promise.then(function (version) {
            $scope.repositories = version.repositories;
            $scope.repositories.unshift($scope.repository);
        });

        $scope.$watch('repository', function (repository) {
            var nutupaneParams = nutupane.getParams();

            if (repository.id === 'all') {
                nutupaneParams['repository_id'] = null;
                nutupane.setParams(nutupaneParams);
            } else {
                nutupaneParams['repository_id'] = repository.id;
                nutupane.setParams(nutupaneParams);
            }

            nutupane.refresh();
        });
    }

    angular
        .module('Bastion.content-views.versions')
        .controller('ContentViewVersionContentController', ContentViewVersionContentController);

    ContentViewVersionContentController.$inject = ['$scope', 'translate', 'Nutupane', 'Package', 'Erratum',
                                                   'PackageGroup', 'PuppetModule', 'OstreeBranch', 'Deb', 'Repository', 'ContentViewVersion'];

})();
