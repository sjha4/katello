require 'test_helper'
require 'katello/pulp_client'

module Katello
  module PulpClient
    class ResponseTest < ActiveSupport::TestCase
      def make_response(body, status: 200, headers: {})
        http = Struct.new(:status, :headers, :body).new(status, headers, body)
        Response.new(http)
      end

      def test_method_access
        resp = make_response({ 'pulp_href' => '/pulp/api/v3/tasks/abc/', 'state' => 'completed' })
        assert_equal '/pulp/api/v3/tasks/abc/', resp.pulp_href
        assert_equal 'completed', resp.state
      end

      def test_bracket_access
        resp = make_response({ 'name' => 'test-repo' })
        assert_equal 'test-repo', resp['name']
      end

      def test_missing_field_returns_nil
        resp = make_response({ 'name' => 'test' })
        assert_nil resp.nonexistent_field
        assert_nil resp['nonexistent']
      end

      def test_nested_hash_wrapped
        resp = make_response({ 'config' => { 'key' => 'value' } })
        nested = resp.config
        assert_kind_of Response, nested
        assert_equal 'value', nested.key
      end

      def test_nested_array_wrapped
        resp = make_response({
          'results' => [
            { 'name' => 'repo-1' },
            { 'name' => 'repo-2' },
          ],
        })
        results = resp.results
        assert_equal 2, results.length
        assert_equal 'repo-1', results[0].name
        assert_equal 'repo-2', results[1].name
      end

      def test_count_from_paginated
        resp = make_response({ 'count' => 42, 'results' => [] })
        assert_equal 42, resp.count
      end

      def test_to_h
        data = { 'name' => 'test', 'id' => 1 }
        resp = make_response(data)
        assert_equal 'test', resp.to_h['name']
      end

      def test_raw_body
        data = { 'name' => 'test' }
        resp = make_response(data)
        assert_equal data, resp.raw_body
      end

      def test_http_status
        resp = make_response({}, status: 201)
        assert_equal 201, resp.http_status
      end

      def test_respond_to_missing
        resp = make_response({ 'name' => 'test' })
        assert resp.respond_to?(:name)
        refute resp.respond_to?(:nonexistent)
      end

      def test_non_hash_body
        resp = make_response('plain text string')
        assert_nil resp['anything']
        assert_nil resp.anything
        assert_equal({}, resp.to_h)
      end

      def test_results_empty_when_no_results_key
        resp = make_response({ 'name' => 'test' })
        assert_equal [], resp.results
      end

      def test_array_results_with_scalars
        resp = make_response({
          'results' => ['a', 'b', 'c'],
        })
        assert_equal ['a', 'b', 'c'], resp.results
      end

      def test_as_json
        resp = make_response({ 'pulp_href' => '/pulp/api/v3/tasks/abc/', 'state' => 'completed' })
        json = resp.as_json
        assert_kind_of Hash, json
        assert_equal '/pulp/api/v3/tasks/abc/', json['pulp_href']
        assert_equal 'completed', json['state']
      end

      def test_as_json_with_indifferent_access
        resp = make_response({ 'pulp_href' => '/pulp/api/v3/tasks/abc/', 'state' => 'completed' })
        data = resp.as_json.with_indifferent_access
        assert_equal 'completed', data[:state]
        assert_equal 'completed', data['state']
      end

      def test_as_json_returns_empty_hash_for_non_hash
        resp = make_response('plain text')
        assert_equal({}, resp.as_json)
      end

      def test_to_h_returns_indifferent_access
        resp = make_response({ 'name' => 'test' })
        h = resp.to_h
        assert_equal 'test', h[:name]
        assert_equal 'test', h['name']
      end

      def test_key?
        resp = make_response({ 'name' => 'test', 'state' => 'completed' })
        assert resp.key?('name')
        assert resp.key?(:state)
        refute resp.key?('nonexistent')
      end

      def test_key_on_non_hash
        resp = make_response('plain text')
        refute resp.key?('anything')
      end

      def test_dig
        resp = make_response({ 'config' => { 'nested' => { 'value' => 42 } } })
        assert_equal({ 'nested' => { 'value' => 42 } }, resp.dig('config'))
        assert_equal({ 'value' => 42 }, resp.dig('config', 'nested'))
        assert_equal 42, resp.dig('config', 'nested', 'value')
        assert_nil resp.dig('nonexistent', 'path')
      end

      def test_dig_on_non_hash
        resp = make_response('plain text')
        assert_nil resp.dig('anything')
      end
    end
  end
end
