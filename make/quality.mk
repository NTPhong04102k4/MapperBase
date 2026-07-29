##@ Chất lượng code

.PHONY: lint
lint: ## ESLint
	$(YARN) lint

.PHONY: lint-fix
lint-fix: ## ESLint --fix
	npx eslint . --fix

.PHONY: tsc
tsc: ## TypeScript type-check
	$(YARN) tsc

.PHONY: test
test: ## Jest
	$(YARN) test

.PHONY: test-watch
test-watch: ## Jest --watch
	npx jest --watch

.PHONY: coverage
coverage: ## Jest + coverage
	npx jest --coverage

.PHONY: verify
verify: lint tsc test ## Cổng kiểm tra trước khi commit/PR
