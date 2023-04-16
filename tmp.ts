
export function modifyJS(
	script: string,
	url: StompURL,
	config: Config,
	type: ScriptType = 'generic'
) {
	try {
		const isModule = type === 'genericModule' || type === 'workerModule';
		const isWorker = type === 'workerModule' || type === 'worker';

		const tree = parse(script, {
			module: isModule,
			next: true,
			specDeviation: true,
			ranges: true,
			globalReturn: true,
			webcompat: true,
		});

		// const catchLoop = 0;

		for (const ctx of new AcornIterator(tree)) {
			typeLoop: switch (ctx.node.type) {
				case 'ImportExpression':
					// todo: add tompc$.import(meta, url)
					ctx.replaceWith(
						b.callExpression(
							b.memberExpression(
								b.identifier(ACCESS_KEY),
								b.identifier('import')
							),
							[
								isModule
									? b.memberExpression(
											b.metaProperty(
												b.identifier('import'),
												b.identifier('meta')
											),
											b.identifier('url')
									  )
									: b.identifier('undefined'),
								ctx.node.source,
							]
						)
					);

					break;
				case 'ImportDeclaration':
					ctx.replaceWith(
						b.importDeclaration(
							ctx.node.specifiers,
							b.literal(
								routeJS(
									new StompURL(
										new URL(ctx.node.source.value, url.toString()),
										url
									),
									url,
									config,
									'genericModule'
								)
							)
						)
					);
					// TODO : FIX..?
					break;
				case 'CallExpression':
					{
						const { callee } = ctx.node;

						if (
							callee.type === 'Identifier' &&
							callee.name === 'eval' &&
							ctx.node.arguments.length
						) {
							/* May be a JS eval function!
							eval will only inherit the scope if the following is met:
							the keyword (not property or function) eval is called
							the keyword doesnt reference a variable named eval
							*/

							// transform eval(...) into eval(...tompc$.eval.eval_scope(eval, ...['code',{note:"eval is possibly a var"}]))
							ctx.replaceWith(
								b.conditionalExpression(
									b.binaryExpression(
										'===',
										b.identifier('eval'),
										b.memberExpression(
											b.identifier(ACCESS_KEY),
											b.identifier('evalSnapshot')
										)
									),
									b.callExpression(b.identifier('eval'), [
										b.callExpression(
											b.memberExpression(
												b.identifier(ACCESS_KEY),
												b.identifier('evalScope')
											),
											ctx.node.arguments.map((arg: unknown) => result(arg))
										),
									]),
									b.callExpression(
										b.identifier('eval'),
										ctx.node.arguments.map((arg: unknown) => result(arg))
									)
								)
							);
						}
					}
					break;
				case 'Identifier':
					{
						switch (ctx.parent?.node.type) {
							case 'ArrayPattern':
							case 'ObjectPattern':
							case 'LabeledStatement':
							case 'MethodDefinition':
							case 'ClassDeclaration':
							case 'RestElement':
							case 'ExportSpecifier':
							case 'ImportSpecifier':
								break typeLoop;
							case 'MemberExpression':
								if (ctx.parentKey === 'property') break typeLoop;
								break;
							case 'VariableDeclarator':
								if (ctx.parentKey === 'id') break typeLoop;
								break;
							case 'Property':
								if (ctx.parentKey === 'key') break typeLoop;
								break;
							case 'FunctionDeclaration':
							case 'FunctionExpression':
								if (ctx.parentKey === 'id') break typeLoop;
							// fallthrough
							case 'ArrowFunctionExpression':
								if (ctx.parentKey === 'params') break typeLoop;
								break;
							case 'AssignmentPattern':
								if (ctx.parentKey === 'left') break typeLoop;
								break;
						}
						if (!UNDEFINABLE.includes(ctx.node.name)) break;

						if (
							ctx.parent?.node.type === 'UpdateExpression' ||
							(ctx.parent?.node.type === 'AssignmentExpression' &&
								ctx.parentKey === 'left')
						) {
							ctx.parent.replaceWith(
								b.callExpression(
									b.memberExpression(
										b.identifier(ACCESS_KEY),
										b.identifier('set1')
									),
									[
										ctx.node,
										b.literal(ctx.node.name),
										// return what the intended value is
										b.arrowFunctionExpression(
											[
												b.identifier(cTarget),
												b.identifier(cProp),
												b.identifier(cValue),
											],
											ctx.parent.node!.type === 'UpdateExpression'
												? b.updateExpression(
														ctx.parent.node.operator,
														b.memberExpression(
															b.identifier(cTarget),
															b.identifier(cProp),
															true
														),
														ctx.parent.node.prefix
												  )
												: b.assignmentExpression(
														ctx.parent.node.operator,
														b.memberExpression(
															b.identifier(cTarget),
															b.identifier(cProp),
															true
														),
														b.identifier(cValue)
												  )
										),
										// set
										b.arrowFunctionExpression(
											[b.identifier(cValue)],
											b.assignmentExpression(
												'=',
												ctx.node,
												b.identifier(cValue)
											)
										),
										ctx.parent!.node.type === 'UpdateExpression'
											? b.identifier('undefined')
											: ctx.parent.node.right,
										b.literal(generatePartial(script, ctx.parent)),
									]
								)
							);
						} else {
							ctx.replaceWith(
								b.callExpression(
									b.memberExpression(
										b.identifier(ACCESS_KEY),
										b.identifier('get')
									),
									[ctx.node, b.literal(ctx.node.name)]
								)
							);
						}
					}
					break;
				case 'MemberExpression':
					{
						switch (ctx.parent?.node.type) {
							case 'ArrayPattern':
							case 'ObjectPattern':
								break typeLoop;
							case 'UnaryExpression':
								if (ctx.parent?.node.operator === 'delete') break typeLoop;
								break;
						}

						if (ctx.node.computed) {
							if (ctx.node.object.type === 'Super') {
								break typeLoop;
							}

							if (ctx.node.property.type === 'Literal') {
								if (!UNDEFINABLE.includes(ctx.node.property.value)) {
									break typeLoop;
								}
							}
						} else
							switch (ctx.node.property.type) {
								case 'Identifier':
									if (!UNDEFINABLE.includes(ctx.node.property.name)) {
										break typeLoop;
									}

									break;
								case 'Literal':
									if (!UNDEFINABLE.includes(ctx.node.property.value)) {
										break typeLoop;
									}

									break;
							}

						// if not computed (object.property), make property a string
						// computed is object[property]

						let propertyArgument;

						// TODO: run property_argument through rewriter
						// object[location[location]]
						if (ctx.node.computed) {
							propertyArgument = result(ctx.node.property);
						} else if (ctx.node.property.type === 'Identifier') {
							propertyArgument = b.literal(ctx.node.property.name);
						} else {
							break;
						}

						if (
							ctx.parent?.node.type === 'NewExpression' &&
							ctx.parentKey === 'callee'
						) {
							ctx.parent!.replaceWith(
								b.callExpression(
									b.memberExpression(
										b.identifier(ACCESS_KEY),
										b.identifier('new2')
									),
									[
										result(ctx.node.object),
										propertyArgument,
										result(b.arrayExpression(ctx.parent!.node.arguments)),
										b.literal(generatePartial(script, ctx.parent!)),
									]
								)
							);
						} else if (
							ctx.parent?.node.type === 'CallExpression' &&
							ctx.parentKey === 'callee'
						) {
							ctx.parent!.replaceWith(
								b.callExpression(
									b.memberExpression(
										b.identifier(ACCESS_KEY),
										b.identifier('call2')
									),
									[
										result(ctx.node.object),
										propertyArgument,
										result(b.arrayExpression(ctx.parent!.node.arguments)),
										b.literal(generatePartial(script, ctx.parent!)),
									]
								)
							);
						} else if (
							ctx.parent?.node.type === 'UpdateExpression' ||
							(ctx.parent?.node.type === 'AssignmentExpression' &&
								ctx.parentKey === 'left')
						) {
							ctx.parent!.replaceWith(
								b.callExpression(
									b.memberExpression(
										b.identifier(ACCESS_KEY),
										b.identifier('set2')
									),
									[
										ctx.node.object,
										propertyArgument,
										b.arrowFunctionExpression(
											[
												b.identifier(cTarget),
												b.identifier(cProp),
												b.identifier(cValue),
											],
											ctx.parent?.node.type === 'UpdateExpression'
												? b.updateExpression(
														ctx.parent!.node.operator,
														b.memberExpression(
															b.identifier(cTarget),
															b.identifier(cProp),
															true
														),
														ctx.parent!.node.prefix
												  )
												: b.assignmentExpression(
														ctx.parent!.node.operator,
														b.memberExpression(
															b.identifier(cTarget),
															b.identifier(cProp),
															true
														),
														b.identifier(cValue)
												  )
										),
										ctx.parent?.node.type === 'UpdateExpression'
											? b.identifier('undefined')
											: ctx.parent!.node.right,
										b.literal(generatePartial(script, ctx.parent!)),
									]
								)
							);
						} else {
							ctx.replaceWith(
								b.callExpression(
									b.memberExpression(
										b.identifier(ACCESS_KEY),
										b.identifier('get2')
									),
									[
										result(ctx.node.object),
										propertyArgument,
										b.literal(generatePartial(script, ctx)),
									]
								)
							);
						}
					}
					break;
			}
		}

		return (
			(isWorker
				? `if (!globalThis.createClient)
	importScripts(${JSON.stringify(injectWorkerJS(url))});

if (!(${JSON.stringify(CLIENT_KEY)} in globalThis))
	createClient(${JSON.stringify(config)}, ${JSON.stringify(url.codec.key)});

if (!${CLIENT_KEY}.applied) 
	${CLIENT_KEY}.apply();`
				: '') +
			(isModule ? `import.meta.url = ${JSON.stringify(url.toString())};` : '') +
			generate(tree)
		);
	} catch (error) {
		return `throw new SyntaxError(${JSON.stringify(String(error))})`;
	}
}
