import time
import datetime
import requests
import json
import logging
import os
from pathlib import Path
import calendar

# Local imports:
from cyan_flask.crypt import CryptManager

crypt_manager = CryptManager()


def set_db_url():
    """
    Sets DB URL with crypt manager.
    """
    key_path = crypt_manager.get_key()
    if key_path and os.getenv("DB_PASS"):
        return "mysql://{}:{}@{}/{}".format(
            os.getenv("DB_USER"),
            crypt_manager.decrypt_message(key_path, os.getenv("DB_PASS")),
            os.getenv("DB_HOST"),
            os.getenv("DB_NAME"),
        )
    elif not key_path and os.getenv("DB_PASS"):
        logging.warning(
            "No key provided for decrypting secrets. \
            Setting MySQL URL without assuming no encryption."
        )
        return "mysql://{}:{}@{}/{}".format(
            os.getenv("DB_USER"),
            os.getenv("DB_PASS"),
            os.getenv("DB_HOST"),
            os.getenv("DB_NAME"),
        )
    else:
        error = "\nNo DB_PASS env var provided for DB user.\
                \nSet DB_PASS in the environment.\n"
        logging.error(error)
        raise Exception(error)


def convert_to_timestamp(unix_time):
    """
    Converts notifications endpoint's timestamps.
    """
    trimmed_time = int(str(unix_time)[:-3])  # NOTE: trimming off 3 trailing 0s
    return datetime.datetime.utcfromtimestamp(trimmed_time).strftime(
        "%Y-%m-%d %H:%M:%S"
    )


def convert_to_unix(timestamp):
    """
    Converts notification timestamp to unix time.
    """
    dt = datetime.datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    unix_time = calendar.timegm(dt.utctimetuple())
    return unix_time


def make_notifications_request(latest_time):
    """
    Gets all notifications from epa cyano endpoint.
    """
    formatted_time = datetime.datetime.fromtimestamp(latest_time).strftime("%Y-%m-%d")
    url = (
        os.environ.get("TOMCAT_API", "https://cyan.epa.gov")
        + "/cyan/cyano/notifications/"
    )
    start_date = "{}T00-00-00-000-0000".format(formatted_time)
    response = _make_request(url + start_date)
    return response


def build_comments_json(comments, images_sources=None):
    """
    Creates serializable json from comment DB objects.
    """
    comments_json = []
    for comment in comments:
        comments_json.append(
            {
                "id": comment.id,
                "title": comment.title,
                "date": get_datetime_string(comment.date),
                "username": comment.username,
                "device": comment.device,
                "browser": comment.browser,
                "comment_text": comment.comment_text,
                "comment_images": build_comment_images(comment.comment_images),
                "replies": build_replies_json(comment.replies),
            }
        )
    return comments_json


def build_replies_json(replies):
    """
    Creates serializable json from reply DB objects.
    """
    replies_json = []
    for reply in replies:
        replies_json.append(
            {
                "id": reply.id,
                "comment_id": reply.comment_id,
                "date": get_datetime_string(reply.date),
                "username": reply.username,
                "body": reply.body,
            }
        )
    return replies_json


def build_comment_images(comment_images, image_sources=[]):
    """
    Creates serializable json from comment_body DB objects.
    """
    comment_images_json = []
    for image in comment_images:
        filename = _build_image_file_path(image.comment_image)
        image_source = get_image_source(filename)
        comment_images_json.append(image_source)
    return comment_images_json


def get_datetime_string(datetime_obj):
    """
    Returns date and time from datetime object.
    Example: DateTime(2020-06-10 10:35:00.12345) --> "2020-06-10 10:35:00"
    """
    return str(datetime_obj).split(".")[0]


def get_image_source(image_path):
    """
    Gets user image from file.
    """
    try:
        with open(image_path, "r") as image_file:
            return image_file.read()
    except IOError as e:
        logging.warning(
            " utils.py get_image_source error reading filename {}:\n {}".format(
                image_path, e
            )
        )
        return {"error": "cannot find image"}


def save_image_source(username, image_source, image_name):
    """
    Saves user image to file.
    """

    filename = _generate_image_filename(username, image_name)
    full_filename = _build_image_file_path(filename)

    try:
        with open(full_filename, "w") as image_file:
            image_file.write(image_source)
        return filename
    except IOError as e:
        logging.warning(
            " utils.py save_image_source error saving image {}:\n {}".format(
                image_name, e
            )
        )
        return {"error": "error saving image"}


def _generate_image_filename(username, image_name):
    """
    Creates filename for user images
    that are saved to disk.
    """
    file_ext = image_name.split(".")[-1]  # gets file extension
    timestamp = (
        str(datetime.datetime.now())
        .replace("-", "")
        .replace(":", "")
        .replace(".", "")
        .replace(" ", "")
    )
    filename = "{}_{}.{}".format(username, timestamp, file_ext)
    return filename


def _build_image_file_path(filename):
    """
    Builds absolute path of image filename.
    """
    cyan_flask_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(cyan_flask_dir, "user_images", filename)


def _make_request(url, data=None):
    try:
        if data:
            response = requests.post(url, data=data)
        else:
            response = requests.get(url)
        return json.loads(response.content)
    except requests.exceptions.Timeout:
        logging.warning("Request to {} timed out.".format(url))
        # TODO: Retry request.
        return None
    except requests.exceptions.RequestException as e:
        logging.warning("Error making request to {}.\n{}".format(url, e))
        # TODO: Handle error.
        return None
    except Exception as e:
        logging.warning("Unknown exception occurred: {}".format(e))
        # TODO: Handle error.
        return None
