## Code Quality

- make check should always return valid on master
	- (it's also under heavy development, so this may be not be true..)
- all database calls should use contexts (in progress)
## Atom Configuration

# go

- go-plus
 - go fmt on save

# javascript

- install nuclide for fancy stuff
- give up on using beautifiers, they don't work well with flowtyping


- personal rules enforced by codeCleanup.sh
	- use imports over require in babelified files for consistency
	- strict mode is added by babel, so do not use it.
	- all files should be flowtyped (in progress)
		- any and object should be discouraged (not yet checked)
