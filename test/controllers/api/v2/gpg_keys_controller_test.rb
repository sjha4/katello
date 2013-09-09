#
# Copyright 2013 Red Hat, Inc.
#
# This software is licensed to you under the GNU General Public
# License as published by the Free Software Foundation; either version
# 2 of the License (GPLv2) or (at your option) any later version.
# There is NO WARRANTY for this software, express or implied,
# including the implied warranties of MERCHANTABILITY,
# NON-INFRINGEMENT, or FITNESS FOR A PARTICULAR PURPOSE. You should
# have received a copy of GPLv2 along with this software; if not, see
# http://www.gnu.org/licenses/old-licenses/gpl-2.0.txt.


require "minitest_helper"

class Api::V2::GpgKeysControllerTest < Minitest::Rails::ActionController::TestCase

  fixtures :all

  def self.before_suite
    models = ["GpgKey"]
    disable_glue_layers(["Candlepin", "Pulp", "ElasticSearch"], models)
  end

  def models
    @organization = Organization.find(organizations(:acme_corporation))
    @product = Product.find(products(:fedora).id)
  end

  def permissions
    @adminster_permission = UserPermission.new(:gpg, :organizations, @organization, @organization)
    @no_permission = NO_PERMISSION
  end

  def setup
    login_user(User.find(users(:admin)))
    User.current = User.find(users(:admin))
    @request.env['HTTP_ACCEPT'] = 'application/json'
    @fake_search_service = @controller.load_search_service(FakeSearchService.new)
    models
    permissions
  end

  def test_index
    get :index, :organization_id => @organization.label

    assert_response :success
    assert_template 'api/v2/gpg_keys/index'
  end

  def test_index_protected
    allowed_perms = [@administer_permission]
    denied_perms = [@no_permission]

    assert_protected_action(:index, allowed_perms, denied_perms) do
      get :index, :organization_id => @organization.label
    end
  end

end
