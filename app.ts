import express, {NextFunction, Request, Response} from "express";
import {Webhook, WebhookUnbrandedRequiredHeaders, WebhookVerificationError} from "standardwebhooks"
import {RenderDeploy, RenderEvent, RenderKeyValue, RenderPostgres, RenderService, WebhookPayload} from "./render";

const app = express();
const port = process.env.PORT || 3001;
const renderWebhookSecret = process.env.RENDER_WEBHOOK_SECRET || '';
if (!renderWebhookSecret ) {
    console.error("Error: RENDER_WEBHOOK_SECRET is not set.");
    process.exit(1);
}

const renderAPIURL = process.env.RENDER_API_URL || "https://api.render.com/v1"

app.get('/', (req: Request, res: Response) => {
  res.send('Render Webhook Receiver is listening!')
})

app.post("/webhook", express.raw({type: 'application/json'}), (req: Request, res: Response, next: NextFunction) => {
    try {
        validateWebhook(req);
    } catch (error) {
       return next(error)
    }

    const payload: WebhookPayload = JSON.parse(req.body)

    res.status(200).send({}).end()

    // handle the webhook async so we don't timeout the request
    handleWebhook(payload)
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    if (err instanceof WebhookVerificationError) {
        res.status(400).send({}).end()
    } else {
        res.status(500).send({}).end()
    }
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function validateWebhook(req: Request) {
    const headers: WebhookUnbrandedRequiredHeaders = {
        "webhook-id": req.header("webhook-id") || "",
        "webhook-timestamp": req.header("webhook-timestamp") || "",
        "webhook-signature": req.header("webhook-signature") || ""
    }

    const wh = new Webhook(renderWebhookSecret);
    wh.verify(req.body, headers);
}

async function handleWebhook(payload: WebhookPayload) {
    try {
        console.log(`webhook of type ${payload.type}`)
    } catch (error) {
        console.error(error)
    }
}


process.on('SIGTERM', () => {
    console.debug('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        console.debug('HTTP server closed')
    })
})
