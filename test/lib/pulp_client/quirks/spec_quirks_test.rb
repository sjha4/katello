require 'test_helper'
require 'katello/pulp_client'

module Katello
  module PulpClient
    module Quirks
      class SpecQuirksTest < ActiveSupport::TestCase
        def test_fix_rpm_gpgcheck_enum
          spec = {
            'components' => {
              'schemas' => {
                'rpm.RpmRepository' => {
                  'properties' => {
                    'gpgcheck' => { 'type' => 'integer', 'enum' => [0, 1] },
                    'repo_gpgcheck' => { 'type' => 'integer', 'enum' => [0, 1] },
                    'name' => { 'type' => 'string' },
                  },
                },
              },
            },
            'paths' => {},
          }

          SpecQuirks.apply!(spec)

          props = spec['components']['schemas']['rpm.RpmRepository']['properties']
          refute props['gpgcheck'].key?('enum')
          refute props['repo_gpgcheck'].key?('enum')
          assert_equal 'string', props['name']['type'] # unchanged
        end

        def test_no_crash_on_missing_schemas
          spec = { 'paths' => {} }
          assert_nothing_raised { SpecQuirks.apply!(spec) }
        end

        def test_no_crash_on_missing_properties
          spec = {
            'components' => {
              'schemas' => {
                'rpm.RpmRepository' => {},
              },
            },
            'paths' => {},
          }
          assert_nothing_raised { SpecQuirks.apply!(spec) }
        end
      end
    end
  end
end
