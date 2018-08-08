require 'katello_test_helper'

module ::Actions::Katello::Product
  class TestBase < ActiveSupport::TestCase
    include Dynflow::Testing
    include Support::Actions::Fixtures
    include Support::Actions::RemoteAction
    include FactoryBot::Syntax::Methods

    let(:action) { create_action action_class }
  end

  class ProductTest < TestBase
    include Dynflow::Testing
    include Support::Actions::Fixtures
    include FactoryBot::Syntax::Methods

    describe ::Actions::Katello::Product do
      before :all do
        @org = taxonomies(:empty_organization)
        @content = FactoryBot.create(:katello_content, :organization => @org)
        @provider = FactoryBot.build('katello_fedora_hosted_provider', organization: @org)
        @product = FactoryBot.build('katello_product', provider: @provider, cp_id: 1234)
        @root = FactoryBot.build('katello_root_repository', product: @product, content_id: @content.id)
        @repository = FactoryBot.build('katello_repository', root: @root)
        @product_content = FactoryBot.build(:katello_product_content, product: @product, content: @content)
        @product.stubs(:product_content_by_id).returns(@product_content)
      end

      describe 'Content Destroy' do
        let(:action_class) { ::Actions::Katello::Product::ContentDestroy }
        let(:candlepin_destroy_class) { ::Actions::Candlepin::Product::ContentDestroy }
        let(:candlepin_remove_class) { ::Actions::Candlepin::Product::ContentRemove }

        it 'plans' do
          Katello::Content.expects(:find).returns(@content)

          action = create_action action_class
          action.stubs(:action_subject).with(@repository)
          plan_action action, @repository.root
          assert_action_planed_with action, candlepin_remove_class, product_id: @product.cp_id,
                                                                    owner: @product.organization.label,
                                                                    content_id: @repository.content_id
          assert_action_planed_with action, candlepin_destroy_class, content_id: @repository.content_id,
                                                                     owner: @product.organization.label
        end

        it 'remove contents if other content exists in different product' do
          action = create_action action_class
          action.stubs(:action_subject).with(@repository)
          plan_action action, @repository.root
          assert_action_planed action, candlepin_remove_class
        end
      end
    end
  end

  class CreateTest < TestBase
    let(:action_class) { ::Actions::Katello::Product::Create }
    let(:product) do
      katello_products(:fedora)
    end

    it 'plans' do
      action.stubs(:action_subject).with do |subject, _params|
        subject.must_equal(product)
      end
      product.expects(:save!).returns([])
      product.organization.label = 'somelabel'
      Katello::Product.expects(:unused_product_id).returns(3)

      plan_action(action, product, product.organization)

      assert_action_planed_with(action,
                                ::Actions::Candlepin::Product::Create,
                                :id => '3',
                                :name => product.name,
                                :owner => product.organization.label,
                                :multiplier => 1,
                                :attributes => [{:name => "arch", :value => "ALL"}])

      # TODO: figure out how to specify the candlepin id or a placeholder
      assert_action_planed(action, ::Actions::Candlepin::Product::CreateUnlimitedSubscription)
    end
  end

  class UpdateTest < TestBase
    let(:action_class) { ::Actions::Katello::Product::Update }
    let(:product) { katello_products(:fedora) }
    let(:action) { create_action action_class }
    let(:key) { katello_gpg_keys(:fedora_gpg_key) }

    it 'plans' do
      action.expects(:action_subject).with(product)
      product.expects(:reload)
      plan_action action, product, :gpg_key_id => key.id
      assert_action_planed_with(action,
                                ::Actions::Katello::Product::RepositoriesGpgReset,
                                product)
    end

    it 'raises error when validation fails' do
      ::Actions::Katello::Product::Update.any_instance.expects(:action_subject).with(product)
      proc { create_and_plan_action action_class, product, :name => '' }.must_raise(ActiveRecord::RecordInvalid)
    end
  end

  class DestroyTest < TestBase
    let(:action_class) { ::Actions::Katello::Product::Destroy }
    let(:candlepin_destroy_class) { ::Actions::Candlepin::Product::Destroy }
    let(:candlepin_delete_pools_class) { ::Actions::Candlepin::Product::DeletePools }
    let(:candlepin_delete_subscriptions_class) { ::Actions::Candlepin::Product::DeleteSubscriptions }

    let(:product) do
      katello_products(:fedora)
    end

    let(:content_view) do
      katello_content_views(:acme_default)
    end

    it 'plans' do
      action.stubs(:action_subject).with do |subject, _params|
        subject.must_equal(product)
      end
      product.expects(:published_content_view_versions).returns([])
      product.expects(:product_contents).returns([])
      default_view_repos = product.repositories.in_default_view.map(&:id)

      action.expects(:plan_self)

      plan_action(action, product)

      assert_action_planed_with(action, candlepin_destroy_class, cp_id: product.cp_id, owner: product.organization.label)
      assert_action_planed_with(action, ::Actions::Katello::Repository::Destroy) do |repo|
        default_view_repos.include?(repo.first.id)
      end

      assert_action_planed_with(action,
                                candlepin_delete_pools_class,
                                cp_id: product.cp_id,
                                organization_label: product.organization.label)

      assert_action_planed_with(action, candlepin_delete_subscriptions_class,
                                cp_id: product.cp_id, organization_label: product.organization.label)
    end

    it 'fails for redhat products' do
      product.expects(:redhat?).returns(true)

      assert_raises(RuntimeError) do
        plan_action(action, product)
      end
    end

    it 'fails if published in content view' do
      # The product being used for the test has been published to a content view
      assert_raises(RuntimeError) do
        plan_action(action, product)
      end
    end
  end
end
