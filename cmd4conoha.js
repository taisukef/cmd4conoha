const https = require('https')

const fetchJSON = async function(url, headers, json, method) {
	return new Promise(function(resolve, reject) {
		const post = json ? JSON.stringify(json) : null
		headers["Accept"] = "application/json"
		if (post) {
			headers["Content-Type"] = 'application/json'
			headers["Content-Length"] = Buffer.byteLength(post)
		}
		const idxpath = url.indexOf('/', 8)
		const host = url.substring(8, idxpath)
		const path = url.substring(idxpath)
		if (!method)
			method = post ? 'POST' : 'GET'
		const data = []
		const req = https.request({
				protocol: 'https:', host: host, path: path, method: method, headers: headers
			}, function(res) {
				res.on('data', (chunk) => {
					data.push(chunk)
				})
				res.on('end', () => {
					const s = Buffer.concat(data)
					const josn = null
					if (s.length > 0)
						json = JSON.parse(s)
					resolve(json)
				})
			}
		)
		req.on('error', (e) => {
			reject(e)
		})
		if (post)
			req.write(post)
		req.end()
	})
}

const getTokens = async function(username, password, tenantId, idEndpoint) {
	const post = { "auth" : { "passwordCredentials" : { "username" : username, "password" : password }, "tenantId": tenantId }}
	const url = idEndpoint + "/v2.0/tokens"
	const data = await fetchJSON(url, {}, post) // 24hour
	return data
}
const getEndpoint = function(tokens, id) {
	for (const ep of tokens.access.serviceCatalog) {
		if (ep.type == id)
			return ep.endpoints[0].publicURL
	}
	return null
}
const getServers = async function(tokens) {
	const url = getEndpoint(tokens, "compute") + "/servers"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data.servers
}
const getServersDetail = async function(tokens) {
	const url = getEndpoint(tokens, "compute") + "/servers/detail"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	//console.log(data)
	return data.servers
}
const deleteServer = async function(tokens, serverid) {
	const url = getEndpoint(tokens, "compute") + "/servers/" + serverid
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id }, null, 'DELETE')
	//console.log(data)
	return data
}
const deleteServerAll = async function(tokens) {
	const servers = await getServers(tokens)
	for (server of servers) {
		await deleteServer(tokens, server.id)
	}
}
const getVMPlan = async function(tokens, planname) {
	const url = getEndpoint(tokens, "compute") + "/flavors"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	for (const plan of data.flavors) {
		if (plan.name == planname)
			return plan.id
	}
	return null
}
const getImages = async function(tokens) {
	const url = getEndpoint(tokens, "compute") + "/images"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data.images
}
const getImage = async function(tokens, imagename) {
	const images = await getImages(tokens)
	for (const image of images) {
		if (image.name == imagename)
			return image.id
	}
	return null
}
const deleteImage = async function(tokens, imageid) {
	const url = getEndpoint(tokens, "image") + "/v2/images/" + imageid
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id }, null, 'DELETE')
	return data
}
const getSecurityGroups = async function(tokens) {
	const url = getEndpoint(tokens, "network") + "/v2.0/security-groups"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data.security_groups
}
const getSecurityGroup = async function(tokens, securityname) {
	const data = await getSecurityGroups(tokens)
	for (const sg of data) {
		if (sg.name == securityname)
			return sg.id
	}
	return null
}
const addServer = async function(tokens, imagename, vmplanname, secgrp) {
	const url = getEndpoint(tokens, "compute") + "/servers"
	const server = {
		tenant_id: tokens.access.token.tenant.id,
		imageRef: await getImage(tokens, imagename),
		flavorRef: await getVMPlan(tokens, vmplanname)
	}
	if (secgrp) {
		server.security_groups = [ { name: secgrp } ]
	}
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id }, { server: server })
	console.log(data)
}
const stopServer = async function(tokens, serverid) {
	const url = getEndpoint(tokens, "compute") + "/servers/" + serverid + "/action"
	console.log(url)
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id }, { 'os-stop': 'null' })
	return data
}
const saveServerImage = async function(tokens, serverid, imgname) {
	const url = getEndpoint(tokens, "compute") + "/servers/" + serverid + "/action"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id }, { createImage: { name: imgname } })
	return data
}
const getNetworks = async function(tokens) {
	const url = getEndpoint(tokens, "network") + "/v2.0/networks"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data.networks
}
const getNetwork = async function(tokens, networkname) {
	const data = await getNetworks(tokens)
	for (const nw of data) {
		if (nw.name == networkname)
			return nw.id
	}
	return null
}
const getPorts = async function(tokens) {
	const url = getEndpoint(tokens, "network") + "/v2.0/ports"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data
}
const getServerByIP = async function(tokens, ip) {
	const ports = await getPorts(tokens)
	for (const p of ports.ports) {
		for (const fip of p.fixed_ips) {
			if (fip.ip_address == ip) {
				return p.device_id
			}
		}
	}
	return null
}
const getBilling = async function(tokens) {
	const url = getEndpoint(tokens, "account") + "/billing-invoices"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data
}
const getBillingInvoice = async function(tokens, invoice_id) {
	const url = getEndpoint(tokens, "account") + "/billing-invoices/" + invoice_id
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data
}
const getOrderItems = async function(tokens) {
	const url = getEndpoint(tokens, "account") + "/order-items"
	const data = await fetchJSON(url, { "X-Auth-Token": tokens.access.token.id })
	return data
}


const env = require('./env')

const main = async function() {
	if (process.argv.length < 2) {
		console.log("ex)")
		console.log("$ node cmd4conoha.js images")
		console.log("$ node cmd4conoha.js add [image_name]")
		console.log("$ node cmd4conoha.js stop [ip]")
		console.log("$ node cmd4conoha.js delete [ip]")
		console.log("etc...")
		return
	}
	const action = process.argv[2]
	const ip = process.argv[3]

	const image_name = "dev"
	const tokens = await getTokens(env.username, env.password, env.tenant_id, env.id_endpoint)

	if (action == 'add') {
		const image_name = process.argv[3]
		if (!image_name) {
			const imgs = await getImages(tokens)
			console.log(imgs.map(i => i.name))
			return
		}
		await addServer(tokens, image_name, 'g-512mb', 'gncs-ipv4-all')
		//await addServer(tokens, image_name, 'g-512mb')
	} else if (action == 'stop') {
		const serverid = await getServerByIP(tokens, ip)
		await stopServer(tokens, serverid)
	} else if (action == 'snap') {
		const image_name = process.argv[3]
		const serverid = await getServerByIP(tokens, ip)
		console.log(serverid)
		await saveServerImage(tokens, serverid, image_name)
	} else if (action == 'delete') {
		const serverid = await getServerByIP(tokens, ip)
		console.log(await deleteServer(tokens, serverid))
	} else if (action == 'images') {
		const imgs = await getImages(tokens)
		console.log(imgs.map(i => i.name))
	} else if (action == 'delete_image') {
		const image_name = process.argv[3]
		const imgid = await getImage(tokens, image_name)
		console.log(await deleteImage(tokens, imgid))
	} else if (action == 'security_groups') {
		const secgrp = await getSecurityGroups(tokens)
		console.log(secgrp.map(i => i.name))
	} else if (action == 'delete_all') {
		await deleteServerAll(tokens)
	} else if (action == 'serversdetail') {
		console.log(await getServersDetail(tokens))
	} else if (action == 'servers') {
		console.log(await getServers(tokens))
	} else if (action == 'networks') {
		const networks = await getNetworks(tokens)
		console.log(networks)
	} else if (action == 'billing') {
		const invoices = await getBilling(tokens)
		console.log(invoices)
		for (const iv of invoices.billing_invoices) {
			const aiv = await getBillingInvoice(tokens, iv.invoice_id)
			for (const item of aiv.billing_invoice.items) {
				console.log(item)
			}
		}
		//console.log(await getOrderItems(tokens))
	}
}

main()
